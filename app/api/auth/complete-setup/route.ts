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
      // Profile exists (vendor/deliverer flow), just update status to approved
      await supabaseAdmin
        .from('profiles')
        .update({ status: 'approved' })
        .eq('id', user.id)

      // Note: Vendor record already created in approve-application, don't create again

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
        organization_id: metadata.organization_id || null,
        status: 'approved'
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

    // If vendor, create vendor record using metadata
    if (userRole === 'vendor' && metadata.business_name) {
      const { error: vendorError } = await supabaseAdmin
        .from('vendors')
        .insert({
          id: user.id,
          business_name: metadata.business_name,
          business_address: metadata.business_address,
          menu_summary: metadata.menu_summary,
          is_active: true
        })

      if (vendorError) {
        console.error('Vendor creation error:', vendorError)
        // Continue anyway - can be fixed later
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
