// app/api/approve-application/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { applicationId, adminId } = body;

    if (!applicationId) {
      return NextResponse.json({ error: "applicationId required" }, { status: 400 });
    }

    // Step 1: Get the application record
    const { data: application, error: appErr } = await supabaseAdmin
      .from("applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (appErr || !application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Step 2: Generate secure invite token
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date();
    tokenExpires.setDate(tokenExpires.getDate() + 7); // Token valid for 7 days

    // Step 3: Create the profile (NO PASSWORD YET - user will set their own)
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        email: application.email,
        full_name: application.full_name,
        role: application.role,
        status: "approved",
        organization: application.organization || "global",
        invite_token: inviteToken,
        invite_token_expires: tokenExpires.toISOString(),
      })
      .select()
      .single();

    if (profileErr) {
      console.error("Profile creation error:", profileErr);
      return NextResponse.json({ error: "Failed to create profile: " + profileErr.message }, { status: 500 });
    }

    // Step 4: If vendor, create vendor record
    if (application.role === "vendor") {
      const { error: vendorErr } = await supabaseAdmin
        .from("vendors")
        .insert({
          id: profile.id,
          business_name: application.business_name || application.full_name,
          business_address: application.business_address || null,
          menu_summary: application.menu_summary || null,
          is_active: true,
        });

      if (vendorErr) {
        console.error("Vendor creation error:", vendorErr);
        // Rollback profile creation
        await supabaseAdmin.from("profiles").delete().eq("id", profile.id);
        return NextResponse.json({ error: "Failed to create vendor: " + vendorErr.message }, { status: 500 });
      }
    }

    // Step 5: Update application status
    await supabaseAdmin
      .from("applications")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId || null,
      })
      .eq("id", applicationId);

    // Step 6: Send invitation email
    const inviteLink = `vendordelivererapp://set-password?token=${inviteToken}`;

    await sendInvitationEmail({
      to: application.email,
      name: application.full_name,
      role: application.role,
      inviteLink: inviteLink,
      expiresAt: tokenExpires,
    });

    return NextResponse.json({
      success: true,
      message: "Application approved and invitation sent",
      profile: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
      },
      inviteLink, // Return for testing/debugging purposes
    });

  } catch (err) {
    console.error("Approval error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Email sending function
async function sendInvitationEmail({
  to,
  name,
  role,
  inviteLink,
  expiresAt
}: {
  to: string;
  name: string;
  role: string;
  inviteLink: string;
  expiresAt: Date;
}) {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2DD4BF, #14B8A6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #14B8A6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Approved!</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>

            <p>Great news! Your application to join Foodies as a <strong>${role}</strong> has been approved.</p>

            <p>To complete your account setup, please set your password by clicking the button below:</p>

            <center>
              <a href="${inviteLink}" class="button">Set Your Password</a>
            </center>

            <p style="margin-top: 20px; font-size: 14px; color: #666;">
              Or copy and paste this link into your app:<br>
              <code style="background: #e0e0e0; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-top: 5px;">${inviteLink}</code>
            </p>

            <p style="margin-top: 20px; color: #666; font-size: 14px;">
              This link will expire on ${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString()}.
            </p>

            <p>If you didn't apply for this account, please ignore this email.</p>

            <p>Welcome to Foodies!<br>The Foodies Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Foodies. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  // For now, just log the email (replace with actual email service later)
  console.log("=== INVITATION EMAIL ===");
  console.log("To:", to);
  console.log("Subject: Welcome to Foodies - Set Your Password");
  console.log("Invite Link:", inviteLink);
  console.log("Expires:", expiresAt.toISOString());
  console.log("========================");

  // TODO: Integrate with email service (SendGrid, Resend, etc.)
  // Example: await emailService.send({ to, subject: 'Welcome to Foodies - Set Your Password', html: emailHtml });
}
