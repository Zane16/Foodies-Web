"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/../../supabaseClient"

export default function ProtectedSuperAdminRoute({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // 1️⃣ If no user logged in → redirect to sign-in
      if (!user) {
        router.push("/superadmin/signin")
        return
      }

      // 2️⃣ Fetch the user’s profile and check role
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (error || !profile) {
        console.error("Profile fetch failed:", error)
        router.push("/superadmin/signin")
        return
      }

      // 3️⃣ If role is not superadmin → kick them out
      if (profile.role !== "superadmin") {
        router.push("/")
        return
      }

      // ✅ Passed all checks
      setLoading(false)
    }

    checkUser()
  }, [router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg text-gray-600">Verifying access...</p>
      </div>
    )
  }

  return <>{children}</>
}
