// app/api/approve-application/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
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

    // Create random password (for testing/development)
    const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

    let userId: string;
    let isNewUser = false;

    // Try to create the auth user
    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: application.email,
      password: randomPassword,
      email_confirm: true,
    });

    if (userErr) {
      // Check if user already exists
      if (userErr.message?.includes('email_exists') || userErr.code === 'email_exists') {
        // Get existing user by email
        const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();

        if (listErr) {
          return NextResponse.json({ error: "Failed to verify existing user" }, { status: 500 });
        }

        const existingUser = users?.find(u => u.email === application.email);

        if (!existingUser) {
          return NextResponse.json({ error: "User exists but could not be verified" }, { status: 500 });
        }

        userId = existingUser.id;
      } else {
        return NextResponse.json({ error: "Failed to create user: " + userErr.message }, { status: 500 });
      }
    } else if (!userData?.user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    } else {
      userId = userData.user.id;
      isNewUser = true;
    }

    // Get current admin ID for audit trail
    const { data: { user: currentUser } } = await supabaseAdmin.auth.getUser();
    const reviewedBy = currentUser?.id || null;

    // Update application status with audit trail
    await supabaseAdmin
      .from("applications")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewedBy
      })
      .eq("id", applicationId);

    // Create or update profile (for all roles)
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .upsert([
        {
          id: userId,
          role: application.role,
          full_name: application.full_name,
          email: application.email,
          organization: application.organization || "global",
          status: "approved", // Set status to approved
        },
      ], {
        onConflict: 'id'
      });

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    let additionalRecord: any = null;

    // Create vendor-specific record if vendor role
    if (application.role === "vendor") {
      const { data: vendorData, error: vendorErr } = await supabaseAdmin
        .from("vendors")
        .insert([
          {
            id: userId, // FK to profiles
            business_name: application.business_name || application.full_name,
            business_address: application.business_address || null,
            menu_summary: application.menu_summary || null,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (vendorErr) {
        return NextResponse.json({ error: vendorErr.message }, { status: 500 });
      }
      additionalRecord = vendorData;
    }

    return NextResponse.json({
      success: true,
      userId,
      role: application.role,
      additionalRecord,
      tempPassword: isNewUser ? randomPassword : undefined, // Only return password for new users
      isNewUser,
    });

  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
