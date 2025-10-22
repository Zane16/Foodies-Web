// app/api/vendors/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Mark route as dynamic
export const dynamic = 'force-dynamic';

// GET all vendors filtered by admin's organization
export async function GET(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the admin's profile to retrieve their organization
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

    // Fetch vendors filtered by organization
    // First get vendor IDs from profiles table that match the organization
    const { data: orgProfiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "vendor")
      .eq("organization", profile.organization);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    const vendorIds = orgProfiles.map(p => p.id);

    // If no vendors in this organization, return empty array
    if (vendorIds.length === 0) {
      return NextResponse.json([]);
    }

    // Now fetch vendor_summary data for these IDs
    const { data, error } = await supabaseAdmin
      .from("vendor_summary")
      .select("*")
      .in("id", vendorIds)
      .eq("is_active", true)
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