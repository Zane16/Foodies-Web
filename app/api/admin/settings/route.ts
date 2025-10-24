import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// GET - Fetch admin settings
export async function GET(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    // Get authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the admin's profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, organization, profile_picture_url, header_image_url, full_name, email")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Verify the user is an admin
    if (profile.role !== "admin" && profile.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    return NextResponse.json({
      organization: profile.organization,
      profile_picture_url: profile.profile_picture_url,
      header_image_url: profile.header_image_url,
      full_name: profile.full_name,
      email: profile.email
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    )
  }
}

// PATCH - Update admin settings
export async function PATCH(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    // Get authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the admin's profile to verify role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Verify the user is an admin
    if (profile.role !== "admin" && profile.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    // Get the update data
    const body = await req.json()
    const { profile_picture_url, header_image_url } = body

    // Build update object (only include fields that are provided)
    const updateData: any = {}
    if (profile_picture_url !== undefined) {
      updateData.profile_picture_url = profile_picture_url
    }
    if (header_image_url !== undefined) {
      updateData.header_image_url = header_image_url
    }

    // If nothing to update, return error
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    // Update the profile
    const { data, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      profile: {
        profile_picture_url: data.profile_picture_url,
        header_image_url: data.header_image_url
      }
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    )
  }
}
