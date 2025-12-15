# Vendor/Deliverer Web Approval Flow Guide

## Overview

This guide explains how vendor/deliverer approvals work using the web-based landing page (not mobile deep links).

## How Admin Approval (by SuperAdmin) Works

The admin approval flow uses Supabase's built-in `inviteUserByEmail()`:

```typescript
// In /api/approve-application - Admin flow
await supabaseAdmin.auth.admin.inviteUserByEmail(application.email, {
  data: {
    full_name: application.full_name,
    role: application.role,
    organization_id: organizationId,
  },
  redirectTo: `${appUrl}/auth/callback`,
});
```

**User receives**: Supabase-sent email with magic link → `/auth/callback` → `/auth/set-password` → dashboard

---

## How Vendor/Deliverer Approval Works (Web)

### Step 1: Admin Approves Application
**Endpoint**: `/api/approve-application`

When admin approves a vendor/deliverer:

```typescript
// Creates auth user (no password yet)
const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
  email: application.email,
  email_confirm: false,
  user_metadata: {
    full_name: application.full_name,
    role: application.role,
    organization_id: organizationId,
    organization: organization,
  },
});

// Creates profile with invite token
await supabaseAdmin.from("profiles").insert({
  id: authUser.user.id,
  email: application.email,
  full_name: application.full_name,
  role: application.role,
  status: "approved",
  organization: organization,
  invite_token: inviteToken, // 64-char hex token
  invite_token_expires: tokenExpires.toISOString(), // 7 days
});

// If vendor, creates vendor record
if (application.role === "vendor") {
  await supabaseAdmin.from("vendors").insert({
    id: profile.id,
    business_name: application.business_name,
    business_address: application.business_address,
    menu_summary: application.menu_summary,
    is_active: true,
  });
}

// Returns invite link
return {
  inviteLink: `https://foodies-web-gamma.vercel.app/auth/accept-invite?token=${inviteToken}`
};
```

**What you get**: Custom invite link with token

---

### Step 2: Send Email to User

**You must implement this** - currently commented out in code.

Email should contain:

```html
<h1>Welcome to Foodies, {{full_name}}!</h1>
<p>Your {{role}} application has been approved.</p>
<p>Click the link below to set your password:</p>
<a href="{{inviteLink}}">Set Your Password</a>
<p>This link expires in 7 days.</p>
```

Where `inviteLink` is: `https://foodies-web-gamma.vercel.app/auth/accept-invite?token=abc123...`

---

### Step 3: User Clicks Link

User clicks email link → Lands on `/auth/accept-invite?token=xxx`

**Frontend** (`/auth/accept-invite/page.tsx`):
```typescript
// Extracts token from URL
const token = searchParams.get('token')

// Calls accept-invite API
const response = await fetch('/api/auth/accept-invite', {
  method: 'POST',
  body: JSON.stringify({ token })
})

// Returns session tokens
const { access_token, refresh_token } = await response.json()

// Client establishes session
await supabase.auth.setSession({ access_token, refresh_token })

// Redirects to /auth/set-password
router.push('/auth/set-password')
```

**Backend** (`/api/auth/accept-invite/route.ts`):
```typescript
// Validates token from profiles table
const { data: profile } = await supabaseAdmin
  .from("profiles")
  .select("id, email, invite_token_expires, role")
  .eq("invite_token", token)
  .single();

// Checks expiration
if (profile.invite_token_expires < new Date()) {
  return { error: "Invitation link has expired" };
}

// Generates magic link session
const { data } = await supabaseAdmin.auth.admin.generateLink({
  type: "magiclink",
  email: profile.email,
});

// Extracts tokens and returns to client
return {
  access_token: "...",
  refresh_token: "..."
};
```

---

### Step 4: User Sets Password

User is now on `/auth/set-password` with active session.

**Frontend** (`/auth/set-password/page.tsx`):
```typescript
// Session already exists from Step 3
const { data: { session } } = await supabase.auth.getSession()

// User submits password form
await supabase.auth.updateUser({
  password: password
})

// Calls complete-setup API
await fetch('/api/auth/complete-setup', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`
  }
})

// Redirects to dashboard based on role
router.push('/vendor/dashboard') // or /rider/dashboard
```

**Backend** (`/api/auth/complete-setup/route.ts`):
```typescript
// Verifies JWT token
const { data: { user } } = await supabaseAdmin.auth.getUser(token)

// Profile already exists, just update status
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()

await supabaseAdmin
  .from('profiles')
  .update({ status: 'approved' })
  .eq('id', user.id)

return { success: true, profile }
```

---

## Database State Throughout Flow

### After Admin Approves (Step 1):
```json
// auth.users
{
  "id": "user-123",
  "email": "vendor@example.com",
  "encrypted_password": null  // No password yet
}

// profiles
{
  "id": "user-123",
  "email": "vendor@example.com",
  "role": "vendor",
  "status": "approved",
  "invite_token": "abc123...",
  "invite_token_expires": "2025-12-22T10:00:00Z"
}

// vendors (if vendor)
{
  "id": "user-123",
  "business_name": "Joe's Pizza",
  "is_active": true
}
```

### After User Accepts Invite (Step 3):
```json
// profiles - token cleared
{
  "id": "user-123",
  "invite_token": null,  // Cleared (one-time use)
  "invite_token_expires": null
}
```

### After User Sets Password (Step 4):
```json
// auth.users - password set
{
  "id": "user-123",
  "email": "vendor@example.com",
  "encrypted_password": "$2a$10$hashed_password"  // Password now set
}
```

---

## Required Environment Variables

```bash
NEXT_PUBLIC_APP_URL=https://foodies-web-gamma.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Implementation Checklist

### ✅ Already Implemented (Web)
- [x] `/auth/accept-invite` landing page
- [x] `/api/auth/accept-invite` token validation endpoint
- [x] `/auth/set-password` password setup page
- [x] `/api/auth/complete-setup` profile completion endpoint
- [x] Token generation in approve-application
- [x] Web URL instead of deep link

### ⏳ You Need to Implement
- [ ] Email sending function
- [ ] Email template (HTML)
- [ ] Set `NEXT_PUBLIC_APP_URL` environment variable
- [ ] Test end-to-end flow

---

## Email Implementation Example

### Using Resend (Recommended)

1. Install Resend:
```bash
npm install resend
```

2. Add to `.env`:
```bash
RESEND_API_KEY=re_your_api_key
```

3. In `/api/approve-application/route.ts` at line 196:
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'Foodies <noreply@foodies-web-gamma.vercel.app>',
  to: application.email,
  subject: `Welcome to Foodies - ${application.role} Account Approved`,
  html: `
    <h1>Welcome ${application.full_name}!</h1>
    <p>Your ${application.role} application has been approved.</p>
    <p>
      <a href="${inviteLink}"
         style="background: #4F46E5; color: white; padding: 12px 24px;
                text-decoration: none; border-radius: 6px; display: inline-block;">
        Set Your Password
      </a>
    </p>
    <p>This link expires on ${tokenExpires.toLocaleDateString()}.</p>
    <p>If you didn't apply for a Foodies account, please ignore this email.</p>
  `
});
```

---

## Mobile App Integration (Optional)

If you want to support **both web and mobile**, you can:

### Option 1: Universal Link
Use universal links (iOS) / App Links (Android) instead of deep links:
- `https://foodies-web-gamma.vercel.app/auth/accept-invite?token=xxx`
- If app installed → opens app
- If not → opens web browser

### Option 2: Dual Links
Send both links in email:
```html
<p>Mobile app user? <a href="foodies://auth/set-password?token={{token}}">Open in app</a></p>
<p>Or <a href="https://foodies-web-gamma.vercel.app/auth/accept-invite?token={{token}}">set password on web</a></p>
```

### Option 3: Smart Redirect
Web landing page detects mobile device and shows "Open in App" button.

---

## Testing the Flow

### Local Testing:
1. Set `NEXT_PUBLIC_APP_URL=http://localhost:3000`
2. Approve a test vendor application
3. Copy the invite link from admin dashboard
4. Open link in browser
5. Should land on `/auth/accept-invite`
6. Should auto-redirect to `/auth/set-password`
7. Set a password
8. Should redirect to `/vendor/dashboard`

### Production Testing:
1. Set `NEXT_PUBLIC_APP_URL=https://foodies-web-gamma.vercel.app`
2. Deploy to Vercel
3. Test full email flow

---

## Troubleshooting

### "Invalid invitation token"
- Token doesn't exist in database
- Token was already used
- Check `profiles.invite_token` column

### "Invitation link has expired"
- Token expired (default 7 days)
- Check `profiles.invite_token_expires` column

### "No session found" on set-password page
- Session wasn't established properly in accept-invite
- Check browser console for errors
- Verify `supabase.auth.setSession()` was called

### Email not sending
- Check email service API key
- Check spam folder
- Verify sender domain is verified (for Resend/SendGrid)

---

## Security Considerations

1. **Token Security**
   - 64-character hex tokens (crypto.randomBytes(32))
   - One-time use (cleared after use)
   - 7-day expiration
   - Stored securely in database

2. **Session Security**
   - Uses Supabase magic link mechanism
   - JWT-based authentication
   - Refresh tokens for long-lived sessions

3. **Password Requirements**
   - Minimum 8 characters
   - Must contain uppercase, lowercase, number
   - Enforced on frontend and backend

4. **Organization Isolation**
   - Vendors inherit admin's organization
   - Ensures proper multi-tenancy

---

## Files Created/Modified

### New Files:
- `/app/auth/accept-invite/page.tsx` - Landing page
- `/app/api/auth/accept-invite/route.ts` - Token validation API
- `VENDOR_DELIVERER_WEB_APPROVAL_GUIDE.md` - This guide

### Modified Files:
- `/app/api/approve-application/route.ts` - Changed deep link to web URL

### Existing Files (No Changes Needed):
- `/app/auth/set-password/page.tsx` - Already works
- `/app/api/auth/complete-setup/route.ts` - Already works

---

## Comparison: Admin vs Vendor/Deliverer Flows

| Aspect | Admin (by SuperAdmin) | Vendor/Deliverer (by Admin) |
|--------|----------------------|----------------------------|
| Method | `inviteUserByEmail()` | Custom token |
| Email sent by | Supabase | You (Resend/SendGrid) |
| Landing page | `/auth/callback` | `/auth/accept-invite` |
| Token type | Supabase magic link | Custom 64-char hex |
| Token expiration | 24 hours (Supabase) | 7 days (configurable) |
| Organization | Creates new org | Inherits admin's org |
| Extra records | None | `vendors` table (if vendor) |

Both flows end at `/auth/set-password` and work the same from there.
