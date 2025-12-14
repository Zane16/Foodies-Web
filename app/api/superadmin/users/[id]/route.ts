// app/api/superadmin/users/[id]/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

// PATCH - Deactivate or reactivate any user (SuperAdmin can deactivate anyone including admins)
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

    // Get target user's profile
    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role, full_name, email")
      .eq("id", targetUserId)
      .single();

    if (targetProfileError || !targetProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
