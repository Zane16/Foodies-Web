// app/api/deliverers/[id]/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

// PATCH - Update deliverer status
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { is_active } = await req.json();
    const delivererId = params.id;

    console.log(`[API] Received request to update deliverer ${delivererId}, is_active: ${is_active}`)

    // Update the status field in profiles table
    // is_active: true -> status: 'approved'
    // is_active: false -> status: 'declined'
    const newStatus = is_active ? 'approved' : 'declined';

    console.log(`[API] Updating deliverer ${delivererId} to status: ${newStatus}`)

    const { data, error: updateError, count } = await supabaseAdmin
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", delivererId)
      .eq("role", "deliverer")
      .select();

    if (updateError) {
      console.error("[API] Error updating deliverer status:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log(`[API] Update result - rows affected:`, data?.length, "data:", data)

    if (!data || data.length === 0) {
      console.error(`[API] No deliverer found with id ${delivererId}`)
      return NextResponse.json({ error: "Deliverer not found" }, { status: 404 });
    }

    console.log(`[API] Successfully updated deliverer ${delivererId} to status: ${newStatus}`)

    return NextResponse.json({
      success: true,
      message: "Deliverer status updated successfully",
      updated: data[0]
    });
  } catch (err) {
    console.error("[API] Error updating deliverer:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
