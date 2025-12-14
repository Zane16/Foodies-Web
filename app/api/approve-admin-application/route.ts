import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const { applicationId, superadminId } = body

    if (!applicationId) {
      return NextResponse.json(
        { error: 'applicationId is required' },
        { status: 400 }
      )
    }

    // Step 1: Get the application record
    const { data: application, error: appErr } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('role', 'admin')
      .single()

    if (appErr || !application) {
      return NextResponse.json(
        { error: 'Admin application not found' },
        { status: 404 }
      )
    }

    // Step 2: Invite user via Supabase (sends automatic email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      application.email,
      {
        data: {
          full_name: application.full_name,
          organization: application.organization || "global",
          role: 'admin'
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`
      }
    )

    if (authError || !authData.user) {
      console.error("Auth invite error:", authError);
      return NextResponse.json({
        error: "Failed to invite admin: " + authError?.message
      }, { status: 500 });
    }

    // Step 3: Create the profile
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        email: application.email,
        full_name: application.full_name,
        role: 'admin',
        status: "approved",
        organization: application.organization || "global",
      })
      .select()
      .single();

    if (profileErr) {
      console.error("Profile creation error:", profileErr);
      // Cleanup: delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({
        error: "Failed to create admin profile: " + profileErr.message
      }, { status: 500 });
    }

    // Step 4: Update application status
    await supabaseAdmin
      .from("applications")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: superadminId || null,
      })
      .eq("id", applicationId);

    return NextResponse.json({
      success: true,
      message: "Admin application approved. Invitation email sent via Supabase.",
      profile: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        organization: profile.organization,
      }
    })

  } catch (error: any) {
    console.error("Approval error:", error);
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}
