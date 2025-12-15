import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "Invite token required" },
        { status: 400 }
      );
    }

    // Find profile with this invite token
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, invite_token_expires, role")
      .eq("invite_token", token)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Invalid invitation token" },
        { status: 404 }
      );
    }

    // Check if token is expired
    if (profile.invite_token_expires) {
      const expiresAt = new Date(profile.invite_token_expires);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: "Invitation link has expired" },
          { status: 400 }
        );
      }
    }

    // Generate a magic link (creates session tokens)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: profile.email,
      options: {
        redirectTo: `${appUrl}/auth/set-password`,
      },
    });

    if (error || !data) {
      console.error("Magic link generation error:", error);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Extract tokens from the generated link
    const url = new URL(data.properties.action_link);
    const access_token = url.searchParams.get("access_token");
    const refresh_token = url.searchParams.get("refresh_token");

    if (!access_token || !refresh_token) {
      return NextResponse.json(
        { error: "Failed to generate session tokens" },
        { status: 500 }
      );
    }

    // Clear the invite token (one-time use)
    await supabaseAdmin
      .from("profiles")
      .update({
        invite_token: null,
        invite_token_expires: null,
      })
      .eq("id", profile.id);

    // Return tokens to client for session establishment
    return NextResponse.json({
      success: true,
      message: "Invitation accepted successfully",
      access_token,
      refresh_token,
    });
  } catch (err) {
    console.error("Accept invite error:", err);
    return NextResponse.json(
      { error: "Server error processing invitation" },
      { status: 500 }
    );
  }
}
