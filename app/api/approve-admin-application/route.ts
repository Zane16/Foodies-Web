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
          role: 'admin'
        },
        redirectTo: redirectUrl
      }
    )

    if (authError || !authData.user) {
      console.error("Auth invite error:", authError);
      return NextResponse.json({
        error: "Failed to invite admin: " + authError?.message
      }, { status: 500 });
    }

    // Step 3: Update application status (profile will be created when user sets password)
    // Store the auth user ID in the application for reference
    await supabaseAdmin
      .from("applications")
      .update({
        status: "approved",
        user_id: authData.user.id,
        reviewed_at: new Date().toISOString(),
        reviewed_by: superadminId || null,
      })
      .eq("id", applicationId);

    return NextResponse.json({
      success: true,
      message: "Admin application approved. Invitation email sent via Supabase.",
      user: {
        id: authData.user.id,
        email: application.email,
        role: 'admin',
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
