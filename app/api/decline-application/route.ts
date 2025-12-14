// app/api/decline-application/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { applicationId, adminId, reason } = body;

    if (!applicationId) {
      return NextResponse.json({ error: "applicationId required" }, { status: 400 });
    }

    // Check if application exists
    const { data: application, error: appErr } = await supabaseAdmin
      .from("applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (appErr || !application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Update application status to declined with audit trail
    const { error: updateErr } = await supabaseAdmin
      .from("applications")
      .update({
        status: "declined",
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId || null,
        notes: reason || "Application declined",
      })
      .eq("id", applicationId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Optionally send a decline notification email
    // TODO: Implement decline notification email if needed

    return NextResponse.json({
      success: true,
      message: "Application declined",
    });

  } catch (err) {
    console.error("Decline error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
