# Secure Password Implementation Guide

## Overview

This implementation follows industry best practices for user onboarding with admin approval:

1. **User applies** → Application submitted (no password created)
2. **Admin approves** → Secure invite token generated
3. **User receives email** → Link to set password
4. **User sets password** → Account activated
5. **User logs in** → Access granted

## Files Created/Modified

### New Files
- ✅ `add_invite_tokens.sql` - Database migration for invite token fields
- ✅ `app/auth/set-password.tsx` - Password setup screen with deep linking
- ✅ `styles/auth/set-password.styles.ts` - Styles for set-password screen
- ✅ `ADMIN_API_GUIDE.md` - Complete admin API implementation guide

### Modified Files
- ✅ `app/auth/login.tsx` - Enhanced to detect invite-pending users

## Implementation Steps

### Step 1: Run Database Migration

Open your Supabase SQL Editor and run:

```bash
# In Supabase Dashboard → SQL Editor → New Query
# Copy and paste the contents of add_invite_tokens.sql
```

This adds:
- `invite_token` (text, unique) - Secure random token
- `invite_token_expires` (timestamp) - Expiration date
- Index for fast lookups

### Step 2: Update Admin API

Follow the guide in `ADMIN_API_GUIDE.md` to implement:

#### Approval Endpoint
```typescript
POST /api/applications/:id/approve
```

This endpoint should:
1. Generate a secure invite token
2. Create profile with `status='approved'`
3. Set token expiration (7 days recommended)
4. Send invitation email with deep link
5. Create vendor record if applicable

#### Key Code Snippet
```typescript
const inviteToken = crypto.randomBytes(32).toString('hex');
const tokenExpires = new Date();
tokenExpires.setDate(tokenExpires.getDate() + 7);

const inviteLink = `vendordelivererapp://set-password?token=${inviteToken}`;
```

### Step 3: Configure Email Service

Choose your email provider:

**Option A: Supabase Auth (Recommended)**
- Configure in Supabase Dashboard → Authentication → Email Templates
- Use custom template with deep link

**Option B: Third-party Service**
- SendGrid, Resend, AWS SES, etc.
- See `ADMIN_API_GUIDE.md` for email template

### Step 4: Test the Flow

#### Test Scenario 1: Happy Path
1. Submit application via mobile app (`/auth/apply`)
2. Check `applications` table → status should be 'pending'
3. Approve via admin panel
4. Check `profiles` table → should have:
   - `status = 'approved'`
   - `invite_token` = random string
   - `invite_token_expires` = 7 days from now
5. Check email → should receive invitation
6. Click deep link → app opens to `/auth/set-password`
7. Set password → auth user created, token cleared
8. Login → access granted

#### Test Scenario 2: Expired Token
1. Manually set `invite_token_expires` to past date
2. Try to use invite link
3. Should show "Link Expired" message

#### Test Scenario 3: Login Before Setting Password
1. Get approved (have profile with invite_token)
2. Try to login
3. Should see: "Your application was approved! Please check your email..."

## Security Features

### 1. Cryptographically Secure Tokens
```typescript
crypto.randomBytes(32).toString('hex')
// Generates 64-character random hex string
```

### 2. Token Expiration
- Default: 7 days
- Configurable per your needs
- Validated before allowing password set

### 3. Single-Use Tokens
- Token cleared immediately after password set
- Cannot be reused

### 4. No Default Passwords
- Users choose their own password
- Must meet complexity requirements:
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number

## Deep Linking

### Configuration
Already configured in `app.json`:
```json
{
  "scheme": "vendordelivererapp"
}
```

### Deep Link Format
```
vendordelivererapp://set-password?token=<invite_token>
```

### How It Works
1. User taps link in email
2. iOS/Android recognizes custom scheme
3. Opens your app automatically
4. Expo Router routes to `/auth/set-password`
5. Token extracted from query params
6. Token validated against database

## Password Requirements

The set-password screen enforces:
- ✅ Minimum 8 characters
- ✅ One uppercase letter (A-Z)
- ✅ One lowercase letter (a-z)
- ✅ One number (0-9)
- ✅ Passwords must match

Visual feedback shows requirements in real-time.

## Error Handling

### Login Errors
| Scenario | Error Message |
|----------|---------------|
| Pending application | "Your account is still pending approval by the admin." |
| Declined application | "Your application has been declined. Contact admin for details." |
| Approved but no password | "Your application was approved! Please check your email for an invitation to set your password." |
| Wrong password | Default Supabase error |

### Set Password Errors
| Scenario | Error Message |
|----------|---------------|
| Invalid token | "This invitation link is not valid." |
| Expired token | "This invitation link has expired. Please contact support." |
| Weak password | "Password must contain at least: ..." |
| Passwords don't match | "Passwords do not match." |

## Database Schema

### profiles table (additions)
```sql
invite_token text UNIQUE
invite_token_expires timestamp with time zone
```

### Example Data Flow

**Before Approval:**
```json
// applications table
{
  "id": "uuid",
  "email": "vendor@example.com",
  "status": "pending",
  "role": "vendor"
}
```

**After Approval:**
```json
// profiles table
{
  "id": "uuid",
  "email": "vendor@example.com",
  "status": "approved",
  "role": "vendor",
  "invite_token": "a1b2c3d4...64chars",
  "invite_token_expires": "2025-12-21T10:00:00Z"
}
```

**After Password Set:**
```json
// profiles table
{
  "id": "uuid",
  "email": "vendor@example.com",
  "status": "approved",
  "role": "vendor",
  "invite_token": null,
  "invite_token_expires": null
}

// auth.users table (Supabase Auth)
{
  "id": "uuid",
  "email": "vendor@example.com",
  "encrypted_password": "hashed_value"
}
```

## Troubleshooting

### Deep Link Not Opening App
**Problem:** Clicking email link opens browser instead of app

**Solutions:**
1. Verify app is installed on device
2. Check scheme in `app.json` matches link
3. For Android: May need app links configuration
4. For iOS: Universal links preferred for production

### Email Not Sending
**Problem:** User not receiving invitation email

**Solutions:**
1. Check email service logs
2. Verify SMTP/API credentials
3. Check spam folder
4. Test with different email provider

### Token Validation Fails
**Problem:** Valid-looking token rejected

**Solutions:**
1. Verify database migration ran successfully
2. Check token hasn't expired
3. Ensure no whitespace in token
4. Verify token exists in database

### "User Already Registered" Error
**Problem:** Password set fails with duplicate user

**Solutions:**
1. Check if auth user already exists
2. Implementation handles this with updateUser
3. May need to clean up auth.users table

## Next Steps

1. ✅ Run database migration
2. ⏳ Implement admin API endpoints
3. ⏳ Configure email service
4. ⏳ Test end-to-end flow
5. ⏳ Deploy to production

## Support

For questions or issues:
1. Check `ADMIN_API_GUIDE.md` for admin implementation
2. Review error messages in app
3. Check Supabase logs
4. Test with different email addresses

---

**Security Note:** Never commit sensitive keys (Supabase service role key, email API keys) to version control. Use environment variables.
