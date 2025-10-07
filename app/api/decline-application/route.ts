// app/api/decline-application/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    // Get applicationId from body
    const body = await req.json();
    const { applicationId } = body;
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

    // Update application status to declined
    const { error: updateErr } = await supabaseAdmin
      .from("applications")
      .update({ status: "declined" })
      .eq("id", applicationId);

    if (updateErr) {
      console.error("Error declining application:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Decline application error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
