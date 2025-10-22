// app/api/vendors/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin, createServerClient } from "@/lib/supabase";

// GET all vendors filtered by admin's organization
export async function GET() {
  try {
    // Get the authenticated user's session
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the admin's profile to retrieve their organization
    const supabaseAdmin = getSupabaseAdmin();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("organization, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching admin profile:", profileError);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Verify the user is an admin or superadmin
    if (profile.role !== "admin" && profile.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Fetch vendors with organization from profiles
    // Join vendor_summary with profiles to filter by organization
    const { data, error } = await supabaseAdmin
      .from("vendor_summary")
      .select(`
        *,
        profiles!inner(organization)
      `)
      .eq("is_active", true)
      .eq("profiles.organization", profile.organization)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching vendors:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("GET vendors error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}