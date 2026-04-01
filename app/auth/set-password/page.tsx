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

      // Get user role from JWT metadata
      const userRole = (session.user.user_metadata?.role as string) || 'admin'
      setRole(userRole)
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

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('No active session found')
      }

      console.log('Updating password for user:', session.user.id)

      // Update password directly using the client-side auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        console.error('Password update error:', updateError)
        throw updateError
      }

      console.log('Password updated successfully')

      // Get user role from JWT metadata (already set in useEffect)
      const userRole = role || 'admin'

      // Map roles to dashboard URLs
      const dashboardMap: Record<string, string> = {
        admin: '/admin/dashboard',
        vendor: '/vendor/dashboard',
        deliverer: '/rider/dashboard',
        superadmin: '/superadmin/dashboard'
      }

      const redirectUrl = dashboardMap[userRole] || '/admin/dashboard'
      console.log('Redirecting to:', redirectUrl)
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
