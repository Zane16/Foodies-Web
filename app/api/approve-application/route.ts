import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { applicationId, adminId } = body;

    if (!applicationId) {
      return NextResponse.json(
        { error: "applicationId required" },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────
    // Step 1: Fetch application
    // ─────────────────────────────────────────────
    const { data: application, error: appErr } = await supabaseAdmin
      .from("applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (appErr || !application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    console.error("APPLICATION:", {
      id: application.id,
      email: application.email,
      role: application.role,
      organization: application.organization,
      notes: application.notes,
    });

    // ─────────────────────────────────────────────
    // Step 2: Redirect URL
    // ─────────────────────────────────────────────
    let redirectUrl: string;

    if (application.role === "admin") {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      redirectUrl = `${appUrl}/auth/callback`;
    } else {
      redirectUrl = "foodies://auth/set-password";
    }

    // ─────────────────────────────────────────────
    // Step 3: Organization handling (ADMIN ONLY)
    // ─────────────────────────────────────────────
    let organizationId: string | null = null;

    if (application.role === "admin") {
      const orgName = application.organization;
      const orgDomain = application.notes; // ✅ FIXED SOURCE

      if (!orgName || !orgDomain) {
        return NextResponse.json(
          { error: "Admin application missing organization or domain" },
          { status: 400 }
        );
      }

      console.error("ADMIN ORG CHECK:", {
        orgName,
        orgDomain,
      });

      // Check existing organization by domain
      const { data: existingOrg, error: findError } =
        await supabaseAdmin
          .from("organizations")
          .select("id")
          .contains("email_domains", [orgDomain])
          .maybeSingle();

      if (findError) {
        console.error("Org lookup failed:", findError);
        return NextResponse.json(
          { error: "Organization lookup failed" },
          { status: 500 }
        );
      }

      if (existingOrg) {
        organizationId = existingOrg.id;
      } else {
        // Create organization
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
          console.error("Failed to create organization:", orgError);
          return NextResponse.json(
            { error: "Failed to create organization" },
            { status: 500 }
          );
        }

        organizationId = newOrg.id;
      }
    }

    console.error("ORG RESULT:", {
      organizationId,
      redirectUrl,
    });

    // ─────────────────────────────────────────────
    // Step 4: Invite user via Supabase
    // ─────────────────────────────────────────────
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(
        application.email,
        {
          data: {
            full_name: application.full_name,
            role: application.role,
            organization_id: organizationId,
            organization: application.organization || "global",
          },
          redirectTo: redirectUrl,
        }
      );

    if (authError || !authData?.user) {
      console.error("Auth invite failed:", authError);
      return NextResponse.json(
        { error: "Failed to invite user" },
        { status: 500 }
      );
    }

    // ─────────────────────────────────────────────
    // Step 5: Update application status
    // ─────────────────────────────────────────────
    await supabaseAdmin
      .from("applications")
      .update({
        status: "approved",
        user_id: authData.user.id,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId || null,
      })
      .eq("id", applicationId);

    return NextResponse.json({
      success: true,
      message: `${application.role} application approved. Invitation sent.`,
      user: {
        id: authData.user.id,
        email: application.email,
        role: application.role,
      },
    });
  } catch (err) {
    console.error("APPROVAL ERROR:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
