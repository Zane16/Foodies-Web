// app/api/superadmin/users/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Fetch all users across all organizations (including admins)
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Fetch all users (customers, vendors, deliverers, and admins) - only approved/active
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role, status, organization, created_at")
      .in("role", ["customer", "vendor", "deliverer", "admin"])
      .eq("status", "approved")
      .order("organization", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
