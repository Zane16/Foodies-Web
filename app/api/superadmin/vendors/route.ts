import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(req.url)
    const organization = searchParams.get('organization')

    let query = supabase
      .from("vendors")
      .select(`
        id,
        business_name,
        business_address,
        menu_summary,
        is_active,
        created_at,
        profiles!inner (
          id,
          full_name,
          email,
          organization,
          status
        )
      `)
      .eq("is_active", true)

    // If organization is specified, filter by it
    if (organization) {
      query = query.eq("profiles.organization", organization)
    }

    const { data: vendors, error } = await query.order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ vendors }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// Deactivate a vendor
export async function DELETE(req: Request) {
  try {
    const supabase = getSupabaseAdmin()
    const { vendorId } = await req.json()

    if (!vendorId) {
      return NextResponse.json({ error: "Vendor ID is required" }, { status: 400 })
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from("vendors")
      .update({ is_active: false })
      .eq("id", vendorId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
