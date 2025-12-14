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

    // Step 2: Determine redirect URL based on role
    let redirectUrl;
    if (application.role === 'admin') {
      // Admins use the web dashboard
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      redirectUrl = `${appUrl}/auth/callback`;
    } else {
      // Vendors and deliverers use the mobile app
      redirectUrl = 'foodies://auth/set-password';
    }

    // Step 3: Handle organization for admin applications (before invite)
    let organizationId = null;
    if (application.role === 'admin' && application.organization) {
      const orgDomain = application.organization;

      // Check if organization exists with this domain
      const { data: existingOrg } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .contains('email_domains', [orgDomain])
        .single();

      organizationId = existingOrg?.id;

      // Create organization if it doesn't exist
      if (!existingOrg) {
        const orgSlug = orgDomain.replace(/\./g, '-').toLowerCase();
        const orgName = orgDomain.split('.')[0].charAt(0).toUpperCase() + orgDomain.split('.')[0].slice(1);

        console.log('Creating organization:', { name: orgName, slug: orgSlug, email_domains: [orgDomain] });

        const { data: newOrg, error: orgError } = await supabaseAdmin
          .from('organizations')
          .insert({
            name: orgName,
            slug: orgSlug,
            email_domains: [orgDomain],
            status: 'active'
          })
          .select('id')
          .single();

        if (orgError) {
          console.error('Failed to create organization:', orgError);
        } else {
          console.log('Organization created successfully:', newOrg);
          organizationId = newOrg?.id || null;
        }
      }
    }

    console.log('=== EMAIL DEBUG ===');
    console.log('Application Role:', application.role);
    console.log('Organization ID:', organizationId);
    console.log('Redirect URL:', redirectUrl);
    console.log('==================');

    // Step 4: Invite user via Supabase (sends automatic email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      application.email,
      {
        data: {
          full_name: application.full_name,
          organization: application.organization || "global",
          organization_id: organizationId,
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

    // Step 5: Update application status (profile will be created when user sets password)
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
