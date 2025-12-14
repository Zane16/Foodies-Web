import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const { organization, email, document_urls, full_name, school_domain } = body

    // Insert into the unified applications table with role='admin'
    const { data, error } = await supabaseAdmin
      .from('applications')
      .insert([
        {
          user_id: null,  // Will be set after approval
          full_name: full_name || organization, // Use org name if no full_name provided
          email,
          role: 'admin',
          status: 'pending',
          organization,
          notes: school_domain, // Store school domain in notes field
          document_urls: document_urls || []
        }
      ])
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to submit application' },
      { status: 400 }
    )
  }
}