// app/api/superadmin/customers/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

// GET - Fetch all customers across all organizations
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Fetch all customers across all organizations
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, phone, delivery_address, status, organization, created_at")
      .eq("role", "customer")
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
