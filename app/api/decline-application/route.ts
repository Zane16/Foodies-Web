// app/api/decline-application/route.ts
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

    // Check if application exists
    const { data: application, error: appErr } = await supabaseAdmin
      .from("applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (appErr || !application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Get current admin ID for audit trail
    const { data: { user: currentUser } } = await supabaseAdmin.auth.getUser();
    const reviewedBy = currentUser?.id || null;

    // Update application status to declined with audit trail
    const { error: updateErr } = await supabaseAdmin
      .from("applications")
      .update({
        status: "declined",
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewedBy
      })
      .eq("id", applicationId);

    if (updateErr) {
      console.error("Error declining application:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    console.log(`❌ Declined application: ${application.email} (${application.role})`);

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Decline application error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
