import { createSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/auth/set-password'

  // Debug logging
  console.log('=== AUTH CALLBACK DEBUG ===')
  console.log('All URL params:', Object.fromEntries(requestUrl.searchParams))
  console.log('token_hash:', token_hash)
  console.log('type:', type)
  console.log('==========================')

  if (token_hash && type) {
    const supabase = createSupabaseClient()

    const { data, error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    })

    console.log('=== VERIFY OTP RESULT ===')
    console.log('Error:', JSON.stringify(error, null, 2))
    console.log('Error message:', error?.message)
    console.log('Error status:', error?.status)
    console.log('Data:', JSON.stringify(data, null, 2))
    console.log('Session exists:', !!data?.session)
    console.log('User exists:', !!data?.user)
    console.log('========================')

    if (!error) {
      console.log('✅ OTP verification successful, redirecting to set-password')
      // Check if this is an invite - redirect to password setup
      if (type === 'invite') {
        return NextResponse.redirect(new URL('/auth/set-password', requestUrl.origin))
      }
      // Otherwise redirect to the next URL
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    } else {
      console.log('❌ OTP verification failed:', error.message)
    }
  }

  console.log('⚠️ Redirecting to error page - no token_hash or type, or verification failed')
  // Return the user to an error page with some instructions
  return NextResponse.redirect(new URL('/auth/error', requestUrl.origin))
}
