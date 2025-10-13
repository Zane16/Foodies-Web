import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(req: Request) {
  try {
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
      console.error("Error fetching vendors:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ vendors }, { status: 200 })
  } catch (error: any) {
    console.error("Error in vendors API:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// Deactivate a vendor
export async function DELETE(req: Request) {
  try {
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
      console.error("Error deactivating vendor:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("Error in vendor deactivation:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
