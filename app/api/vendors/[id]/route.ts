// app/api/vendors/[id]/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const vendorId = params.id;
    if (!vendorId) {
      return NextResponse.json({ error: "Missing vendorId" }, { status: 400 });
    }

    // Soft delete: just mark vendor as inactive
    const { error } = await supabaseAdmin
      .from("vendors")
      .update({ is_active: false })
      .eq("id", vendorId);

    if (error) {
      console.error("Error deactivating vendor:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`🚫 Deactivated vendor: ${vendorId}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE vendor error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
