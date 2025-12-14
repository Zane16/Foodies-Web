// app/api/approve-application/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { applicationId, adminId } = body;

    if (!applicationId) {
      return NextResponse.json({ error: "applicationId required" }, { status: 400 });
    }

    // Step 1: Get the application record
    const { data: application, error: appErr } = await supabaseAdmin
      .from("applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (appErr || !application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Step 2: Invite user via Supabase (sends automatic email)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUrl = `${appUrl}/auth/callback`;

    console.log('=== EMAIL DEBUG ===');
    console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
    console.log('Final appUrl:', appUrl);
    console.log('Redirect URL:', redirectUrl);
    console.log('==================');

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      application.email,
      {
        data: {
          full_name: application.full_name,
          organization: application.organization || "global",
          role: application.role
        },
        redirectTo: redirectUrl
      }
    )

    if (authError || !authData.user) {
      console.error("Auth invite error:", authError);
      return NextResponse.json({
        error: "Failed to invite user: " + authError?.message
      }, { status: 500 });
    }

    // Step 3: Update application status (profile will be created when user sets password)
    await supabaseAdmin
      .from("applications")
      .update({
        status: "approved",
        user_id: authData.user.id,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId || null,
      })
      .eq("id", applicationId);

    return NextResponse.json({
      success: true,
      message: `${application.role} application approved. Invitation email sent via Supabase.`,
      user: {
        id: authData.user.id,
        email: application.email,
        role: application.role,
      }
    });

  } catch (err) {
    console.error("Approval error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
