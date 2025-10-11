// app/api/vendors/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET all vendors using the vendor_summary view
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("vendor_summary")
      .select("*")
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