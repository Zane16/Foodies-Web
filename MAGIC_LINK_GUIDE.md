# Magic Link Setup Guide

## For Admin (Web Application)

When you approve a vendor or deliverer, send them a magic link email with one of these URLs:

### Option 1: Using Supabase Recovery Link (Recommended)

Use Supabase's built-in password recovery to generate a magic link:

```javascript
// On your admin web app
const { data, error } = await supabase.auth.resetPasswordForEmail(
  vendorEmail,
  {
    redirectTo: 'foodies://auth/set-password',
  }
)
```

The email will contain a link like:
```
foodies://auth/callback?type=recovery&access_token=XXXXX
```

This will automatically open the mobile app and direct them to set their password.

---

### Option 2: Custom Token Link

If you're generating your own tokens, send:

```
foodies://auth/set-password?token=YOUR_CUSTOM_TOKEN
```

---

## Email Template Example

**Subject:** Welcome to Foodies - Set Your Password

**Body:**
```
Hello [Vendor Name],

Your account has been approved!

Click the link below to set your password and start using the Foodies app:

[Magic Link Button]

This link will open the Foodies mobile app on your device.

If you haven't installed the app yet, download it here:
- iOS: [App Store Link]
- Android: [Play Store Link]

Best regards,
Foodies Team
```

---

## How It Works

1. **Admin approves user** → Generates magic link
2. **User receives email** → Opens on their mobile device
3. **Link opens app** → Routes to Set Password screen
4. **User sets password** → Automatically logged in
5. **Redirected to home** → Ready to use the app

---

## Technical Details

### Deep Link Configuration

The app is configured to handle these URL schemes:
- `foodies://auth/set-password` - Password setup screen
- `foodies://auth/callback` - OAuth/Magic link callback handler

### URL Parameters

**For set-password screen:**
- `token` - Custom token (if using custom implementation)
- `access_token` + `type=recovery` - Supabase recovery token (recommended)

---

## Testing

To test the magic link locally:

1. **Send test email:**
   ```javascript
   await supabase.auth.resetPasswordForEmail('test@example.com', {
     redirectTo: 'foodies://auth/set-password',
   })
   ```

2. **Check email** and click the link

3. **Should open app** and show Set Password screen

---

## Troubleshooting

**Link doesn't open app:**
- Ensure app is installed on the device
- Check that `foodies://` scheme is registered in app.json

**"Invalid or expired link" error:**
- Magic links expire after 1 hour (Supabase default)
- Generate a new link for the user

**App opens but shows error:**
- Check console logs for specific error messages
- Verify user exists in database
- Check Supabase redirect URL configuration

---

## Supabase Dashboard Setup

1. Go to **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   ```
   foodies://auth/callback
   foodies://auth/set-password
   ```

3. Under **Email Templates** → **Change Email / Reset Password**:
   - Set redirect URL to: `foodies://auth/set-password`
