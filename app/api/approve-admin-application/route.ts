import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const { applicationId, superadminId } = body

    if (!applicationId) {
      return NextResponse.json(
        { error: 'applicationId is required' },
        { status: 400 }
      )
    }

    // Step 1: Get the application record
    const { data: application, error: appErr } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('role', 'admin')
      .single()

    if (appErr || !application) {
      return NextResponse.json(
        { error: 'Admin application not found' },
        { status: 404 }
      )
    }

    // Step 2: Generate secure invite token
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date();
    tokenExpires.setDate(tokenExpires.getDate() + 7); // Token valid for 7 days

    // Step 3: Create the profile (NO PASSWORD YET - admin will set their own)
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        email: application.email,
        full_name: application.full_name,
        role: 'admin',
        status: "approved",
        organization: application.organization || "global",
        invite_token: inviteToken,
        invite_token_expires: tokenExpires.toISOString(),
      })
      .select()
      .single();

    if (profileErr) {
      console.error("Profile creation error:", profileErr);
      return NextResponse.json({ error: "Failed to create admin profile: " + profileErr.message }, { status: 500 });
    }

    // Step 4: Update application status
    await supabaseAdmin
      .from("applications")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: superadminId || null,
      })
      .eq("id", applicationId);

    // Step 5: Send invitation email
    // For admins, use web link instead of mobile deep link
    const webInviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://yourapp.com'}/auth/set-password?token=${inviteToken}`;
    const mobileInviteLink = `vendordelivererapp://set-password?token=${inviteToken}`;

    await sendAdminInvitationEmail({
      to: application.email,
      name: application.full_name,
      organization: application.organization,
      webInviteLink,
      mobileInviteLink,
      expiresAt: tokenExpires,
    });

    return NextResponse.json({
      success: true,
      message: "Admin application approved and invitation sent",
      profile: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        organization: profile.organization,
      },
      inviteLink: webInviteLink, // Return for testing/debugging purposes
    })

  } catch (error: any) {
    console.error("Approval error:", error);
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}

// Email sending function for admin invitations
async function sendAdminInvitationEmail({
  to,
  name,
  organization,
  webInviteLink,
  mobileInviteLink,
  expiresAt
}: {
  to: string;
  name: string;
  organization: string;
  webInviteLink: string;
  mobileInviteLink: string;
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
          .code { background: #e0e0e0; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-top: 5px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Admin Application Approved!</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>

            <p>Great news! Your application to join Foodies as an <strong>Admin</strong> for <strong>${organization}</strong> has been approved.</p>

            <p>To complete your account setup, please set your password by clicking the button below:</p>

            <center>
              <a href="${webInviteLink}" class="button">Set Your Password</a>
            </center>

            <p style="margin-top: 20px; font-size: 14px; color: #666;">
              Or copy and paste this link into your browser:<br>
              <span class="code">${webInviteLink}</span>
            </p>

            <p style="margin-top: 20px; color: #666; font-size: 14px;">
              This link will expire on ${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString()}.
            </p>

            <p>Once you've set your password, you'll be able to access the admin panel and manage vendors, deliverers, and customers for your organization.</p>

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
  console.log("=== ADMIN INVITATION EMAIL ===");
  console.log("To:", to);
  console.log("Subject: Welcome to Foodies Admin - Set Your Password");
  console.log("Web Invite Link:", webInviteLink);
  console.log("Mobile Invite Link:", mobileInviteLink);
  console.log("Expires:", expiresAt.toISOString());
  console.log("===============================");

  // TODO: Integrate with email service (SendGrid, Resend, etc.)
  // Example: await emailService.send({ to, subject: 'Welcome to Foodies Admin - Set Your Password', html: emailHtml });
}
