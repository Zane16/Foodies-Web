"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AcceptInvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(true)

  useEffect(() => {
    const processInvite = async () => {
      const token = searchParams.get('token')

      if (!token) {
        setError('Invalid invitation link - no token provided')
        setProcessing(false)
        return
      }

      try {
        const response = await fetch('/api/auth/accept-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Invalid or expired invitation')
        }

        // Establish session with returned tokens
        const { createSupabaseClient } = await import('@/lib/supabase')
        const supabase = createSupabaseClient()

        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token
        })

        // Session created successfully, redirect to set password
        router.push('/auth/set-password')
      } catch (err: any) {
        console.error('Invite processing error:', err)
        setError(err.message || 'Failed to process invitation')
        setProcessing(false)
      }
    }

    processInvite()
  }, [searchParams, router])

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Processing Invitation</CardTitle>
            <CardDescription>Please wait while we verify your invite link...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invitation Error</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md">
            {error}
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Please contact your administrator for a new invitation link.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
