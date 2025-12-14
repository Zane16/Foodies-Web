// app/api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

// PATCH - Deactivate or reactivate a user
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { action } = await req.json();
    const targetUserId = params.id;

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    if (!action || !['deactivate', 'reactivate'].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be 'deactivate' or 'reactivate'" }, { status: 400 });
    }

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the token and get current user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the admin's profile
    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from("profiles")
      .select("organization, role")
      .eq("id", user.id)
      .single();

    if (adminProfileError || !adminProfile) {
      return NextResponse.json({ error: "Admin profile not found" }, { status: 404 });
    }

    // Verify the user is an admin
    if (adminProfile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Get target user's profile
    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from("profiles")
      .select("organization, role, full_name, email")
      .eq("id", targetUserId)
      .single();

    if (targetProfileError || !targetProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Security check: Admin cannot deactivate users outside their organization
    if (targetProfile.organization !== adminProfile.organization) {
      return NextResponse.json({
        error: "Forbidden: Cannot manage users outside your organization"
      }, { status: 403 });
    }

    // Security check: Admin cannot deactivate other admins
    if (targetProfile.role === "admin") {
      return NextResponse.json({
        error: "Forbidden: Cannot deactivate admin users"
      }, { status: 403 });
    }

    if (action === 'deactivate') {
      // Update profile status to 'declined'
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ status: 'declined' })
        .eq("id", targetUserId);

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 });
      }

      // Disable Supabase auth account (ban indefinitely)
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUserId,
        { ban_duration: '876000h' } // ~100 years
      );

      if (authUpdateError) {
        console.error("Error disabling auth account:", authUpdateError);
        // Continue even if auth disable fails - profile is already updated
      }

      return NextResponse.json({
        success: true,
        message: "User deactivated successfully",
        user: { id: targetUserId, status: 'declined' }
      });
    } else {
      // action === 'reactivate'
      // Update profile status to 'approved'
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ status: 'approved' })
        .eq("id", targetUserId);

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 });
      }

      // Re-enable Supabase auth account (remove ban)
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUserId,
        { ban_duration: 'none' }
      );

      if (authUpdateError) {
        console.error("Error enabling auth account:", authUpdateError);
        // Continue even if auth enable fails - profile is already updated
      }

      return NextResponse.json({
        success: true,
        message: "User reactivated successfully",
        user: { id: targetUserId, status: 'approved' }
      });
    }
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
