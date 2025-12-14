import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createSupabaseClient } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    // Get auth token from request header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No authorization header' },
        { status: 401 }
      )
    }

    // Verify the user's JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      // Profile exists, just update status to active
      await supabaseAdmin
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', user.id)

      return NextResponse.json({
        success: true,
        profile: existingProfile
      })
    }

    // Create new profile from user metadata
    const metadata = user.user_metadata
    const userRole = metadata.role || 'admin'

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name: metadata.full_name || '',
        role: userRole,
        organization: metadata.organization || 'global',
        status: 'active'
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return NextResponse.json(
        { error: `Failed to create profile: ${profileError.message}` },
        { status: 500 }
      )
    }

    // If vendor, create vendor record
    if (userRole === 'vendor') {
      const { data: application } = await supabaseAdmin
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .eq('role', 'vendor')
        .single()

      if (application) {
        const { error: vendorError } = await supabaseAdmin
          .from('vendors')
          .insert({
            id: user.id,
            business_name: application.business_name || metadata.full_name,
            business_address: application.business_address,
            menu_summary: application.menu_summary,
            is_active: true
          })

        if (vendorError) {
          console.error('Vendor creation error:', vendorError)
          // Continue anyway - can be fixed later
        }
      }
    }

    return NextResponse.json({
      success: true,
      profile
    })

  } catch (error: any) {
    console.error('Setup completion error:', error)
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}
