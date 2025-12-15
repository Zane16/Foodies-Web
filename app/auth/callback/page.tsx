"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createSupabaseClient()

      console.log('=== AUTH CALLBACK DEBUG ===')
      console.log('Hash:', window.location.hash)
      console.log('Search:', window.location.search)
      console.log('Full URL:', window.location.href)

      // Check for error in URL params (from Supabase)
      const urlParams = new URLSearchParams(window.location.search)
      const errorParam = urlParams.get('error')
      const errorDescription = urlParams.get('error_description')

      if (errorParam) {
        console.error('Auth error from URL:', errorParam, errorDescription)
        setError(errorDescription || errorParam)
        router.push('/auth/error')
        return
      }

      // Handle the hash fragment (Supabase magic link uses hash-based auth)
      // This automatically exchanges the token for a session
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')

      console.log('Hash params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type })

      if (accessToken && type === 'invite') {
        // For invite flow, set the session from the tokens
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        })

        if (sessionError) {
          console.error('Session error:', sessionError)
          setError(sessionError.message)
          router.push('/auth/error')
          return
        }

        console.log('Session set successfully:', !!data.session)
        // User is authenticated, redirect to password setup
        router.push('/auth/set-password')
        return
      }

      // Fallback: check if we already have a session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      console.log('Existing session:', !!session)
      console.log('==========================')

      if (sessionError) {
        console.error('Session check error:', sessionError)
        setError(sessionError.message)
        router.push('/auth/error')
        return
      }

      if (session) {
        // User is authenticated, redirect to password setup
        router.push('/auth/set-password')
      } else {
        // No session found
        console.error('No session or token found')
        setError('No authentication token found')
        router.push('/auth/error')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Processing invitation...</h2>
        <p className="text-gray-600">Please wait while we verify your invite link.</p>
        {error && (
          <p className="text-red-600 text-sm mt-4">Debug: {error}</p>
        )}
      </div>
    </div>
  )
}
