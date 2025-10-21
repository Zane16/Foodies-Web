import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin()
    const { adminId } = await req.json()

    if (!adminId) {
      return NextResponse.json({ error: "Admin ID is required" }, { status: 400 })
    }

    // Generate a new random password
    const newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)

    // Update the user's password using admin API
    const { data, error } = await supabase.auth.admin.updateUserById(
      adminId,
      { password: newPassword }
    )

    if (error) {
      console.error("Password reset error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      newPassword,
      email: data.user.email
    }, { status: 200 })

  } catch (error: any) {
    console.error("Reset password error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
