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

    console.log("APPLICATION:", {
      id: application.id,
      email: application.email,
      role: application.role,
      organization: application.organization,
    });

    // ─────────────────────────────────────────────
    // VENDOR/DELIVERER FLOW: Custom Invite Tokens
    // ─────────────────────────────────────────────
    if (application.role === "vendor" || application.role === "deliverer") {
      return await handleVendorDelivererApproval(
        supabaseAdmin,
        application,
        applicationId,
        adminId
      );
    }

    // ─────────────────────────────────────────────
    // ADMIN FLOW: Supabase inviteUserByEmail
    // ─────────────────────────────────────────────
    return await handleAdminApproval(
      supabaseAdmin,
      application,
      applicationId,
      adminId
    );
  } catch (err) {
    console.error("APPROVAL ERROR:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

// ═════════════════════════════════════════════════════════════
// VENDOR/DELIVERER APPROVAL: Using Supabase inviteUserByEmail
// ═════════════════════════════════════════════════════════════
async function handleVendorDelivererApproval(
  supabaseAdmin: any,
  application: any,
  applicationId: string,
  adminId?: string
) {
  // Step 1: Get admin's organization
  let organizationId: string | null = null;
  let organization = "global";

  if (adminId) {
    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("organization, organization_id")
      .eq("id", adminId)
      .single();

    if (adminProfile) {
      organizationId = adminProfile.organization_id;
      organization = adminProfile.organization || "global";
    }
  }

  console.log("Organization info:", { organizationId, organization });

  // Step 2: Invite user via Supabase Auth (sends email automatically)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUrl = `${appUrl}/auth/callback`;

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(application.email, {
      data: {
        full_name: application.full_name,
        role: application.role,
        organization_id: organizationId,
        organization: organization,
        // Pass vendor-specific data for profile creation
        business_name: application.business_name,
        business_address: application.business_address,
        menu_summary: application.menu_summary,
        // Pass deliverer-specific data
        vehicle_type: application.vehicle_type,
        availability: application.availability,
      },
      redirectTo: redirectUrl,
    });

  if (authError || !authData?.user) {
    console.error("Auth invite failed:", authError);
    return NextResponse.json(
      { error: "Failed to invite user: " + authError?.message },
      { status: 500 }
    );
  }

  console.log("User invited via email:", authData.user.id);

  // Step 3: Generate magic link for manual fallback
  // Supabase's email service is unreliable, so we provide the link as backup
  const { data: magicLinkData, error: magicLinkError } =
    await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: application.email,
      options: {
        redirectTo: redirectUrl,
      }
    });

  let magicLink = null;
  if (!magicLinkError && magicLinkData?.properties?.action_link) {
    // Extract the action link which contains the full invite URL
    magicLink = magicLinkData.properties.action_link;
    console.log("Magic link generated as fallback:", magicLink.substring(0, 50) + "...");
  }

  // Step 4: Update application status
  // Note: Profile and vendor record will be created when user completes setup
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
    message: `${application.role} application approved. Invitation email sent to ${application.email}.`,
    user: {
      id: authData.user.id,
      email: application.email,
      role: application.role,
    },
    magicLink: magicLink, // Return magic link for manual fallback
    emailNote: "Note: If the email doesn't arrive, use the invite link below to manually send it.",
  });
}

// ═════════════════════════════════════════════════════════════
// ADMIN APPROVAL: Supabase inviteUserByEmail Flow
// ═════════════════════════════════════════════════════════════
async function handleAdminApproval(
  supabaseAdmin: any,
  application: any,
  applicationId: string,
  adminId?: string
) {
  const orgName = application.organization;
  const orgDomain = application.notes;

  if (!orgName || !orgDomain) {
    return NextResponse.json(
      { error: "Admin application missing organization or domain" },
      { status: 400 }
    );
  }

  console.log("ADMIN ORG CHECK:", { orgName, orgDomain });

  // Check existing organization by domain
  const { data: existingOrg, error: findError } = await supabaseAdmin
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

  let organizationId: string;

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

  // Invite user via Supabase Auth
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUrl = `${appUrl}/auth/callback`;

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(application.email, {
      data: {
        full_name: application.full_name,
        role: application.role,
        organization_id: organizationId,
        organization: application.organization || "global",
      },
      redirectTo: redirectUrl,
    });

  if (authError || !authData?.user) {
    console.error("Auth invite failed:", authError);
    return NextResponse.json(
      { error: "Failed to invite user" },
      { status: 500 }
    );
  }

  // Generate magic link for manual fallback
  const { data: magicLinkData, error: magicLinkError } =
    await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: application.email,
      options: {
        redirectTo: redirectUrl,
      }
    });

  let magicLink = null;
  if (!magicLinkError && magicLinkData?.properties?.action_link) {
    magicLink = magicLinkData.properties.action_link;
    console.log("Magic link generated for admin:", magicLink.substring(0, 50) + "...");
  }

  // Update application status
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
    message: `Admin application approved. Invitation sent via email.`,
    user: {
      id: authData.user.id,
      email: application.email,
      role: application.role,
    },
    magicLink: magicLink,
    emailNote: "Note: If the email doesn't arrive, use the invite link below to manually send it.",
  });
}
