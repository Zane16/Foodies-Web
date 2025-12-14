"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createSupabaseClient()

      // Check if we have a session (Supabase automatically handles the hash fragment)
      const { data: { session }, error } = await supabase.auth.getSession()

      console.log('=== AUTH CALLBACK DEBUG ===')
      console.log('Session:', session)
      console.log('Error:', error)
      console.log('Hash:', window.location.hash)
      console.log('==========================')

      if (error) {
        console.error('Session error:', error)
        router.push('/auth/error')
        return
      }

      if (session) {
        // User is authenticated, redirect to password setup
        router.push('/auth/set-password')
      } else {
        // No session, show error
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
      </div>
    </div>
  )
}
