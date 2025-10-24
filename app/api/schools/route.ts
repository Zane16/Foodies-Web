import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    // Fetch all admins grouped by organization
    const { data: admins, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, organization, status, created_at")
      .eq("role", "admin")
      .order("organization", { ascending: true })
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch vendors count per organization
    // Join vendors table with profiles to get organization
    const { data: vendors, error: vendorsError } = await supabase
      .from("vendors")
      .select(`
        id,
        profiles!inner (
          organization
        )
      `)
      .eq("is_active", true)

    if (vendorsError) {
      return NextResponse.json({ error: vendorsError.message }, { status: 500 })
    }

    // Fetch deliverers count per organization
    const { data: deliverers, error: deliverersError } = await supabase
      .from("profiles")
      .select("organization")
      .eq("role", "deliverer")

    if (deliverersError) {
      return NextResponse.json({ error: deliverersError.message }, { status: 500 })
    }

    // Count vendors and deliverers per organization
    const vendorCounts = new Map<string, number>()
    vendors?.forEach((v: any) => {
      const org = v.profiles?.organization || "Unknown Organization"
      vendorCounts.set(org, (vendorCounts.get(org) || 0) + 1)
    })

    const delivererCounts = new Map<string, number>()
    deliverers?.forEach((d) => {
      const org = d.organization || "Unknown Organization"
      delivererCounts.set(org, (delivererCounts.get(org) || 0) + 1)
    })

    // Group admins by organization (school)
    const schoolsMap = new Map<string, {
      school_name: string
      admin_email: string
      admin_name: string
      admin_id: string
      status: string
      date_created: string
      admin_count: number
      vendor_count: number
      deliverer_count: number
      all_admins: Array<{
        id: string
        full_name: string | null
        email: string | null
        status: string | null
        created_at: string | null
      }>
    }>()

    admins?.forEach((admin) => {
      const schoolName = admin.organization || "Unknown Organization"

      if (!schoolsMap.has(schoolName)) {
        // First admin for this school - use as primary
        schoolsMap.set(schoolName, {
          school_name: schoolName,
          admin_email: admin.email || "N/A",
          admin_name: admin.full_name || "N/A",
          admin_id: admin.id,
          status: admin.status || "pending",
          date_created: admin.created_at || new Date().toISOString(),
          admin_count: 1,
          vendor_count: vendorCounts.get(schoolName) || 0,
          deliverer_count: delivererCounts.get(schoolName) || 0,
          all_admins: [admin]
        })
      } else {
        // Additional admin for existing school
        const school = schoolsMap.get(schoolName)!
        school.admin_count += 1
        school.all_admins.push(admin)

        // If this admin was created earlier, update the date
        if (admin.created_at && new Date(admin.created_at) < new Date(school.date_created)) {
          school.date_created = admin.created_at
        }

        // If current primary admin is not approved but this one is, update to this admin
        if (school.status !== "approved" && admin.status === "approved") {
          school.admin_email = admin.email || school.admin_email
          school.admin_name = admin.full_name || school.admin_name
          school.admin_id = admin.id
          school.status = admin.status || school.status
        }
      }
    })

    // Convert map to array
    const schools = Array.from(schoolsMap.values())

    return NextResponse.json({ schools }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
