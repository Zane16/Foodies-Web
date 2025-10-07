// app/api/vendors/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const vendorId = params.id;
    if (!vendorId) {
      return NextResponse.json({ error: "Missing vendorId" }, { status: 400 });
    }

    // 1. Downgrade the profile role back to "customer"
    await supabaseAdmin
      .from("profiles")
      .update({ role: "customer", status: "pending" })
      .eq("id", vendorId);

    // 2. Optionally: also remove them from vendors table if you’re using it
    await supabaseAdmin.from("vendors").delete().eq("auth_user_id", vendorId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE vendor error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}