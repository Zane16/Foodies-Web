// app/api/applications/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin, createServerClient } from "@/lib/supabase";

// GET - Fetch all pending applications filtered by admin's organization
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

    // Fetch pending applications filtered by organization
    const { data, error } = await supabaseAdmin
      .from("applications")
      .select("*")
      .eq("status", "pending")
      .eq("organization", profile.organization)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching applications:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("GET applications error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST - Create a new application
export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const {
      full_name,
      email,
      role,
      business_name,
      business_address,
      menu_summary,
      vehicle_type,
      availability,
      notes,
      organization,
      document_urls, // ✅ Changed from document_url to document_urls
    } = body ?? {};

    if (!full_name || !email || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const payload = {
      full_name,
      email,
      role: String(role).toLowerCase(),
      business_name: business_name || null,
      business_address: business_address || null,
      menu_summary: menu_summary || null,
      vehicle_type: vehicle_type || null,
      availability: availability || null,
      notes: notes || null,
      organization: organization || null,
      document_urls: Array.isArray(document_urls) ? document_urls : (document_urls ? [document_urls] : []), // ✅ Changed to document_urls
      status: "pending",
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("applications")
      .insert([payload])
      .select();

    if (error) {
      console.error("Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}