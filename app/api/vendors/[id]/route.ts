// app/api/vendors/[id]/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

// PATCH - Update vendor status
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { is_active } = await req.json();
    const vendorId = params.id;

    if (!vendorId) {
      return NextResponse.json({ error: "Missing vendorId" }, { status: 400 });
    }

    // Update vendor is_active status in vendors table
    const { error: vendorError } = await supabaseAdmin
      .from("vendors")
      .update({ is_active })
      .eq("id", vendorId);

    if (vendorError) {
      return NextResponse.json({ error: vendorError.message }, { status: 500 });
    }

    // Also update the profile status field
    // is_active: true -> status: 'approved'
    // is_active: false -> status: 'declined'
    const newStatus = is_active ? 'approved' : 'declined';

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", vendorId)
      .eq("role", "vendor");

    if (profileError) {
      console.error("Error updating profile status:", profileError);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
