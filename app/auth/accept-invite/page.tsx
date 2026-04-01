"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function AcceptInvitePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Processing Invitation</CardTitle>
          <CardDescription>
            Your invitation is being processed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            If you have an invitation link, please use it to accept your invitation.
          </p>
          <Button
            onClick={() => router.push('/admin/signin')}
            className="w-full"
          >
            Go to Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}