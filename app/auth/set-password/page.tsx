"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createSupabaseClient()

      // Give the browser time to process and store the session from the hash
      await new Promise(resolve => setTimeout(resolve, 300))

      // Get the session from browser storage
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        console.error('No session found:', error)
        router.push('/admin/signin')
        return
      }

      console.log('Session found:', session.user.email)
      setEmail(session.user.email || '')

      // Get user role from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        setRole(profile.role)
      }
    }

    checkSession()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!passwordRegex.test(password)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and number')
      return
    }

    setLoading(true)

    try {
      const supabase = createSupabaseClient()

      // Get the session to retrieve access token
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('No active session found')
      }

      // Update password using the API endpoint with admin client
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ password })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update password')
      }

      // Get user session again to refresh
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No user session found')
      }

      // Check if profile exists, if not create it
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!existingProfile) {
        // Create profile from user metadata
        const metadata = user.user_metadata
        const userRole = metadata.role || 'admin'

        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: metadata.full_name || '',
            role: userRole,
            organization: metadata.organization || 'global',
            status: 'active'
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
          throw new Error('Failed to create profile')
        }

        // If vendor, also need to get application details and create vendor record
        if (userRole === 'vendor') {
          // Fetch the application details
          const { data: application } = await supabase
            .from('applications')
            .select('*')
            .eq('user_id', user.id)
            .eq('role', 'vendor')
            .single()

          if (application) {
            const { error: vendorError } = await supabase
              .from('vendors')
              .insert({
                id: user.id,
                business_name: application.business_name || metadata.full_name,
                business_address: application.business_address,
                menu_summary: application.menu_summary,
                is_active: true
              })

            if (vendorError) {
              console.error('Vendor creation error:', vendorError)
              // Continue anyway - admin can fix this later
            }
          }
        }
      } else {
        // Update existing profile to active
        await supabase
          .from('profiles')
          .update({ status: 'active' })
          .eq('id', user.id)
      }

      // Redirect based on role
      const userRole = existingProfile?.role || user.user_metadata.role || 'admin'
      const dashboardMap: Record<string, string> = {
        admin: '/admin/dashboard',
        vendor: '/vendor/dashboard',
        deliverer: '/rider/dashboard',
        superadmin: '/superadmin/dashboard'
      }

      const redirectUrl = dashboardMap[userRole] || '/admin/dashboard'
      router.push(redirectUrl)

    } catch (err: any) {
      console.error('Password update error:', err)
      setError(err.message || 'Failed to set password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set Your Password</CardTitle>
          <CardDescription>
            Welcome! Please create a password for your account{email && `: ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
                required
              />
              <p className="text-xs text-gray-500">
                At least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                disabled={loading}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Setting Password...' : 'Set Password & Continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
