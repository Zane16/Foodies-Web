"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createSupabaseClient()

      console.log('=== AUTH CALLBACK DEBUG ===')
      console.log('Hash:', window.location.hash)
      console.log('URL:', window.location.href)

      // Give Supabase time to process the hash fragment automatically
      await new Promise(resolve => setTimeout(resolve, 500))

      // Check if session was established
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Session error:', sessionError)
        router.push('/auth/error')
        return
      }

      if (session) {
        console.log('Session established, redirecting to set-password')
        // Redirect to set-password - session should be available in browser storage
        router.push('/auth/set-password')
      } else {
        console.log('No session found')
        router.push('/auth/error')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Processing your invitation</CardTitle>
          <CardDescription>Please wait while we verify your magic link...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Processing invitation...</h2>
        <p className="text-gray-600">Please wait while we verify your invite link.</p>
      </div>
    </div>
  )
}
