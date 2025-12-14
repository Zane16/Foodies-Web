import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json();
    const { applicationId, superadminId } = body;

    if (!applicationId) {
      return NextResponse.json(
        { error: "applicationId is required" },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────
    // Step 1: Fetch ADMIN application
    // ─────────────────────────────────────────────
    const { data: application, error: appErr } = await supabaseAdmin
      .from("applications")
      .select("*")
      .eq("id", applicationId)
      .eq("role", "admin")
      .single();

    if (appErr || !application) {
      return NextResponse.json(
        { error: "Admin application not found" },
        { status: 404 }
      );
    }

    const orgName = application.organization;
    const orgDomain = application.notes; // ✅ domain comes from notes

    if (!orgName || !orgDomain) {
      return NextResponse.json(
        { error: "Admin application missing organization or domain" },
        { status: 400 }
      );
    }

    console.error("ADMIN APPROVAL:", {
      applicationId,
      email: application.email,
      orgName,
      orgDomain,
    });

    // ─────────────────────────────────────────────
    // Step 2: Find or create organization
    // ─────────────────────────────────────────────
    let organizationId: string;

    const { data: existingOrg, error: findError } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .contains("email_domains", [orgDomain])
      .maybeSingle();

    if (findError) {
      console.error("Organization lookup failed:", findError);
      return NextResponse.json(
        { error: "Failed to check organization" },
        { status: 500 }
      );
    }

    if (existingOrg) {
      organizationId = existingOrg.id;
    } else {
      const slug = orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const { data: newOrg, error: orgError } = await supabaseAdmin
        .from("organizations")
        .insert({
          name: orgName,
          slug,
          email_domains: [orgDomain],
          status: "active",
        })
        .select("id")
        .single();

      if (orgError || !newOrg) {
        console.error("Organization creation failed:", orgError);
        return NextResponse.json(
          { error: "Failed to create organization" },
          { status: 500 }
        );
      }

      organizationId = newOrg.id;
    }

    // ─────────────────────────────────────────────
    // Step 3: Invite admin via Supabase
    // ─────────────────────────────────────────────
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUrl = `${appUrl}/auth/callback`;

    console.error("INVITE DEBUG:", {
      redirectUrl,
      organizationId,
    });

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(
        application.email,
        {
          data: {
            full_name: application.full_name,
            role: "admin",
            organization_id: organizationId, // ✅ CRITICAL FIX
            organization: orgName,
          },
          redirectTo: redirectUrl,
        }
      );

    if (authError || !authData?.user) {
      console.error("Auth invite failed:", authError);
      return NextResponse.json(
        { error: "Failed to invite admin" },
        { status: 500 }
      );
    }

    // ─────────────────────────────────────────────
    // Step 4: Update application status
    // ─────────────────────────────────────────────
    await supabaseAdmin
      .from("applications")
      .update({
        status: "approved",
        user_id: authData.user.id,
        reviewed_at: new Date().toISOString(),
        reviewed_by: superadminId || null,
      })
      .eq("id", applicationId);

    return NextResponse.json({
      success: true,
      message: "Admin application approved and organization linked.",
      user: {
        id: authData.user.id,
        email: application.email,
        role: "admin",
        organization_id: organizationId,
      },
    });
  } catch (error: any) {
    console.error("APPROVE ADMIN ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
