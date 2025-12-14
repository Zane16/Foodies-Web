# Admin API Guide: Secure Password Invitation Flow

This guide explains how to implement the secure invite + set password flow in your admin panel API.

## Overview

When an admin approves a vendor or deliverer application, the system should:
1. Create a profile record with `status = 'approved'`
2. Generate a secure invite token
3. Send an email invitation with the token
4. **Do NOT create a password** - users set their own

## Database Changes Required

First, run the migration file `add_invite_tokens.sql` in your Supabase SQL editor to add the required columns to the `profiles` table.

## Admin API Endpoint

### Endpoint: `POST /api/applications/:id/approve`

This endpoint should be called when an admin approves an application.

#### Implementation Steps

```typescript
// Example implementation for your admin API
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Supabase Admin Client (use service_role key for admin operations)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function approveApplication(req, res) {
  const { applicationId } = req.params;
  const { adminId } = req.body; // ID of admin who approved

  try {
    // Step 1: Get the application details
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Step 2: Generate a secure invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date();
    tokenExpires.setDate(tokenExpires.getDate() + 7); // Token valid for 7 days

    // Step 3: Create the profile (NO PASSWORD YET)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        email: application.email,
        full_name: application.full_name,
        role: application.role,
        status: 'approved',
        organization: application.organization || 'global',
        invite_token: inviteToken,
        invite_token_expires: tokenExpires.toISOString(),
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return res.status(500).json({ error: 'Failed to create profile' });
    }

    // Step 4: If vendor, create vendor record
    if (application.role === 'vendor') {
      const { error: vendorError } = await supabaseAdmin
        .from('vendors')
        .insert({
          id: profile.id,
          business_name: application.business_name,
          business_address: application.business_address,
          menu_summary: application.menu_summary,
          is_active: true,
        });

      if (vendorError) {
        console.error('Vendor creation error:', vendorError);
        // Rollback profile creation
        await supabaseAdmin.from('profiles').delete().eq('id', profile.id);
        return res.status(500).json({ error: 'Failed to create vendor' });
      }
    }

    // Step 5: Update application status
    await supabaseAdmin
      .from('applications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
      })
      .eq('id', applicationId);

    // Step 6: Send invitation email
    const inviteLink = `vendordelivererapp://set-password?token=${inviteToken}`;
    // Alternative web link (if you have a web version):
    // const inviteLink = `https://yourapp.com/auth/set-password?token=${inviteToken}`;

    await sendInvitationEmail({
      to: application.email,
      name: application.full_name,
      role: application.role,
      inviteLink: inviteLink,
      expiresAt: tokenExpires,
    });

    return res.status(200).json({
      success: true,
      message: 'Application approved and invitation sent',
      profile: profile,
    });
  } catch (error) {
    console.error('Approval error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Email sending function (use your email service)
async function sendInvitationEmail({ to, name, role, inviteLink, expiresAt }) {
  // Option 1: Use Supabase Auth (recommended if using Supabase)
  // This requires setting up email templates in Supabase Dashboard

  // Option 2: Use a third-party email service (SendGrid, Resend, etc.)
  // Example with nodemailer:

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
            <h1>🎉 Application Approved!</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>

            <p>Great news! Your application to join Foodies as a <strong>${role}</strong> has been approved.</p>

            <p>To complete your account setup, please set your password by clicking the button below:</p>

            <center>
              <a href="${inviteLink}" class="button">Set Your Password</a>
            </center>

            <p style="margin-top: 20px; font-size: 14px; color: #666;">
              Or copy and paste this link into your browser:<br>
              <code style="background: #e0e0e0; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-top: 5px;">${inviteLink}</code>
            </p>

            <p style="margin-top: 20px; color: #666; font-size: 14px;">
              ⚠️ This link will expire on ${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString()}.
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

  // Send email using your preferred service
  // Example: await emailService.send({ to, subject: 'Welcome to Foodies - Set Your Password', html: emailHtml });

  console.log('Invitation email sent to:', to);
}
```

## Decline Endpoint

### Endpoint: `POST /api/applications/:id/decline`

```typescript
export async function declineApplication(req, res) {
  const { applicationId } = req.params;
  const { adminId, reason } = req.body;

  try {
    const { error } = await supabaseAdmin
      .from('applications')
      .update({
        status: 'declined',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
        notes: reason || 'Application declined',
      })
      .eq('id', applicationId);

    if (error) {
      return res.status(500).json({ error: 'Failed to decline application' });
    }

    // Optionally send a decline notification email

    return res.status(200).json({
      success: true,
      message: 'Application declined',
    });
  } catch (error) {
    console.error('Decline error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

## Security Considerations

1. **Token Security**
   - Use `crypto.randomBytes(32)` for cryptographically secure tokens
   - Store tokens hashed if you want extra security (optional)
   - Set reasonable expiration (7 days recommended)

2. **Email Validation**
   - Verify email format before creating profile
   - Check for duplicate emails

3. **Rate Limiting**
   - Limit approval requests to prevent abuse
   - Track failed attempts

4. **Admin Authentication**
   - Verify admin has permission to approve applications
   - Log all approval/decline actions for audit trail

## Deep Linking Setup

The mobile app is configured with the scheme `vendordelivererapp://`. Deep links should use:

```
vendordelivererapp://set-password?token=<invite_token>
```

When users click this link on their mobile device:
1. The app will open automatically
2. Navigate to `/auth/set-password`
3. Token will be passed via query params
4. User sets password
5. Profile's invite_token is cleared
6. User can now log in normally

## Testing the Flow

1. Create a test application via the mobile app
2. In your admin panel, approve the application
3. Check that:
   - Profile created with `status = 'approved'`
   - `invite_token` and `invite_token_expires` are set
   - Email sent with correct deep link
4. Click the link on mobile device
5. App should open to set-password screen
6. Set password
7. Verify token is cleared from database
8. Login with new credentials

## Troubleshooting

**Issue: Email not sending**
- Check email service configuration
- Verify SMTP credentials or API keys
- Check spam folder

**Issue: Deep link not opening app**
- Verify app scheme matches in `app.json`
- Test with both `vendordelivererapp://` and web fallback
- Ensure app is installed on device

**Issue: Token validation fails**
- Check token hasn't expired
- Verify token matches exactly (no extra spaces)
- Ensure database migration ran successfully
