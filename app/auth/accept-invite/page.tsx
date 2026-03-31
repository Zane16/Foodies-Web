// /app/api/auth/accept-invite/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 400 })
    }

    // Use service role key to perform admin actions
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify invite token by looking up user by token
    // Supabase doesn't have direct "accept invite by token" API,
    // usually we track token in a table or let magic link do it.
    // For demo, we assume token maps to user's email in `invite_tokens` table

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('invite_tokens')
      .select('*')
      .eq('token', token)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 400 })
    }

    // Optionally, mark token as used
    await supabaseAdmin
      .from('invite_tokens')
      .update({ used: true })
      .eq('token', token)

    // Everything ok, return success
    return NextResponse.json({ success: true, email: invite.email })

  } catch (err: any) {
    console.error('Accept invite error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}