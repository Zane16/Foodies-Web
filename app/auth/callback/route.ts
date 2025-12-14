import { createSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/auth/set-password'

  if (token_hash && type) {
    const supabase = createSupabaseClient()

    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    })

    if (!error) {
      // Check if this is an invite - redirect to password setup
      if (type === 'invite') {
        return NextResponse.redirect(new URL('/auth/set-password', requestUrl.origin))
      }
      // Otherwise redirect to the next URL
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  // Return the user to an error page with some instructions
  return NextResponse.redirect(new URL('/auth/error', requestUrl.origin))
}
