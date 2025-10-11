"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield } from "lucide-react"
import { supabase } from "@/../../supabaseClient"

export default function SuperAdminSignInPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
  
    const form = e.currentTarget
    const email = (form.email as HTMLInputElement).value
    const password = (form.password as HTMLInputElement).value
  
    try {
      // 1️⃣ Authenticate with Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
  
      if (signInError) throw signInError
      const user = data.user
      if (!user) throw new Error("No user found")
  
      // 2️⃣ Get the user's role from profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
  
      if (profileError) throw profileError
  
      // 3️⃣ Redirect based on role
      switch (profile.role) {
        case "superadmin":
          router.push("/SuperAdmin/dashboard")
          break
        case "admin":
          router.push("/admin/dashboard")
          break
        case "vendor":
          router.push("/vendor/dashboard")
          break
        case "deliverer":
          router.push("/deliverer/dashboard")
          break
        default:
          throw new Error("Unknown role or unauthorized access")
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }
  

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">SuperAdmin Login</CardTitle>
          <CardDescription>Restricted access — authorized personnel only</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="superadmin@domain.com" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" required />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
