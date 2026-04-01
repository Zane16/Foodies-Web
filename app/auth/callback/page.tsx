"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createSupabaseClient()

      console.log('=== AUTH CALLBACK DEBUG ===')
      console.log('Hash:', window.location.hash)
      console.log('URL:', window.location.href)

      // Use onAuthStateChange to wait for Supabase to process the magic link
      // This ensures the session is properly set before redirecting
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event, 'Session:', !!session)

          if (event === 'SIGNED_IN' && session) {
            console.log('User signed in, redirecting to set-password')
            subscription?.unsubscribe()
            router.push('/auth/set-password')
          } else if (event === 'SIGNED_OUT' || !session) {
            // Give Supabase time to process the hash before checking session
            setTimeout(() => {
              supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) {
                  console.log('Session found via getSession, redirecting')
                  subscription?.unsubscribe()
                  router.push('/auth/set-password')
                } else {
                  console.log('No session found, showing error')
                  subscription?.unsubscribe()
                  router.push('/auth/error')
                }
              })
            }, 1000)
          }
        }
      )
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Processing invitation...</h2>
        <p className="text-gray-600">Please wait while we verify your invite link.</p>
      </div>
    </div>
  )
}
