// app/api/approve-application/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { applicationId } = body;

    if (!applicationId) {
      return NextResponse.json({ error: "applicationId required" }, { status: 400 });
    }

    // Get the application record
    const { data: application, error: appErr } = await supabaseAdmin
      .from("applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (appErr || !application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // ✅ Create random password (for testing)
    const randomPassword = Math.random().toString(36).slice(-8);

    // ✅ Create the user directly (no email invite)
    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: application.email,
      password: randomPassword,
      email_confirm: true,
    });

    if (userErr || !userData?.user) {
      console.error("User creation error:", userErr);
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    const userId = userData.user.id;

    // ✅ Update application status
    await supabaseAdmin.from("applications").update({ status: "approved" }).eq("id", applicationId);

    let newRecord: any = null;

    // ✅ Insert into vendors or profiles depending on role
    if (application.role === "vendor") {
      const { data: vendorData, error: vendorErr } = await supabaseAdmin
        .from("vendors")
        .insert([
          {
            name: application.business_name || application.full_name,
            auth_user_id: userId,
            status: "approved",
          },
        ])
        .select()
        .single();

      if (vendorErr) {
        console.error("Vendor creation error:", vendorErr);
        return NextResponse.json({ error: vendorErr.message }, { status: 500 });
      }
      newRecord = vendorData;

      await supabaseAdmin.from("profiles").insert([
        {
          id: userId,
          role: "vendor",
          full_name: application.full_name,
          organization: application.organization || null,
          vendor_name: application.business_name || null,
          status: "approved",
        },
      ]);
    } else if (application.role === "deliverer") {
      const { data: delivererData, error: delivererErr } = await supabaseAdmin
        .from("profiles")
        .insert([
          {
            id: userId,
            role: "deliverer",
            full_name: application.full_name,
            organization: application.organization || null,
            status: "approved",
          },
        ])
        .select()
        .single();

      if (delivererErr) {
        console.error("Deliverer creation error:", delivererErr);
        return NextResponse.json({ error: delivererErr.message }, { status: 500 });
      }
      newRecord = delivererData;
    }

    console.log(`✅ Created user: ${application.email} | Password: ${randomPassword}`);

    // ✅ Return temp password for testing
    return NextResponse.json({
      success: true,
      newRecord,
      tempPassword: randomPassword, // <— Use this to log in manually for now
    });

  } catch (err) {
    console.error("Approve application error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
