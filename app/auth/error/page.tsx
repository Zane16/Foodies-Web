"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function AuthErrorPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authentication Error</CardTitle>
          <CardDescription>
            There was a problem with your invitation link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            This could happen if:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>The link has expired</li>
            <li>The link has already been used</li>
            <li>The link is invalid or corrupted</li>
          </ul>
          <p className="text-sm text-gray-600">
            Please contact your administrator for a new invitation link.
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
