// app/api/auth/set-password/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { token, password, confirmPassword } = body;

    // Validate required fields
    if (!token) {
      return NextResponse.json({ error: "Invite token is required" }, { status: 400 });
    }

    if (!password || !confirmPassword) {
      return NextResponse.json({ error: "Password and confirmation are required" }, { status: 400 });
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        {
          error: "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number"
        },
        { status: 400 }
      );
    }

    // Step 1: Find profile by invite token
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("invite_token", token)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "This invitation link is not valid." },
        { status: 404 }
      );
    }

    // Step 2: Check if token has expired
    const tokenExpires = new Date(profile.invite_token_expires);
    const now = new Date();

    if (now > tokenExpires) {
      return NextResponse.json(
        { error: "This invitation link has expired. Please contact support." },
        { status: 400 }
      );
    }

    // Step 3: Create or update auth user with password
    let authUserId: string;

    // Check if auth user already exists
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error("Error listing users:", listError);
      return NextResponse.json({ error: "Failed to verify user" }, { status: 500 });
    }

    const existingAuthUser = users?.find(u => u.email === profile.email);

    if (existingAuthUser) {
      // Update existing auth user with new password
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingAuthUser.id,
        {
          password: password,
          email_confirm: true,
        }
      );

      if (updateError) {
        console.error("Error updating auth user:", updateError);
        return NextResponse.json(
          { error: "Failed to set password: " + updateError.message },
          { status: 500 }
        );
      }

      authUserId = existingAuthUser.id;
    } else {
      // Create new auth user
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: profile.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: profile.full_name,
          role: profile.role,
        },
      });

      if (createError) {
        console.error("Error creating auth user:", createError);
        return NextResponse.json(
          { error: "Failed to create account: " + createError.message },
          { status: 500 }
        );
      }

      authUserId = createData.user.id;
    }

    // Step 4: Update profile to clear invite token and set status to active
    const { error: updateProfileError } = await supabaseAdmin
      .from("profiles")
      .update({
        invite_token: null,
        invite_token_expires: null,
        status: "active",
      })
      .eq("id", profile.id);

    if (updateProfileError) {
      console.error("Error updating profile:", updateProfileError);
      return NextResponse.json(
        { error: "Failed to activate account: " + updateProfileError.message },
        { status: 500 }
      );
    }

    // Step 5: Return success
    return NextResponse.json({
      success: true,
      message: "Password set successfully. You can now log in.",
      user: {
        id: authUserId,
        email: profile.email,
        role: profile.role,
      },
    });

  } catch (err) {
    console.error("Set password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
