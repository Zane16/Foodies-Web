import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const { applicationId, email } = body

    if (!applicationId || !email) {
      return NextResponse.json(
        { error: 'applicationId and email are required' },
        { status: 400 }
      )
    }

    // Get the application record
    const { data: application, error: appErr } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('role', 'admin')
      .single()

    if (appErr || !application) {
      console.error('Application fetch error:', appErr)
      return NextResponse.json(
        { error: 'Admin application not found' },
        { status: 404 }
      )
    }

    // Generate random password for testing
    const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)

    // Create the auth user
    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: randomPassword,
      email_confirm: true,
    })

    if (userErr || !userData?.user) {
      console.error('User creation error:', userErr)
      return NextResponse.json(
        { error: 'Failed to create user: ' + (userErr?.message || 'Unknown error') },
        { status: 500 }
      )
    }

    const userId = userData.user.id

    // Update application status
    const { error: updateErr } = await supabaseAdmin
      .from('applications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', applicationId)

    if (updateErr) {
      console.error('Application update error:', updateErr)
      return NextResponse.json(
        { error: 'Failed to update application status' },
        { status: 500 }
      )
    }

    // Create or update profile
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert([
        {
          id: userId,
          role: 'admin',
          full_name: application.full_name,
          email: application.email,
          organization: application.organization,
          status: 'approved'
        }
      ])

    if (profileErr) {
      console.error('Profile creation error:', profileErr)
      return NextResponse.json(
        { error: 'Failed to create admin profile: ' + profileErr.message },
        { status: 500 }
      )
    }

    console.log(`✅ Admin approved: ${email} | Password: ${randomPassword}`)

    return NextResponse.json({
      success: true,
      message: 'Admin application approved',
      email: email,
      tempPassword: randomPassword // For testing - will be displayed to SuperAdmin
    })

  } catch (error: any) {
    console.error('Approve admin application error:', error)
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}
