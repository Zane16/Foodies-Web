// app/api/applications/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET - Fetch all pending applications
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("applications")
      .select("*")
      .eq("status", "pending")
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