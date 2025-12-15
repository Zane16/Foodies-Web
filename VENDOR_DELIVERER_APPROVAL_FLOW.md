# Vendor/Deliverer Approval Flow

## Overview

This document explains how the admin approval process works for vendor and deliverer applications.

## Flow Comparison

### Admin Approval (Web-based)
```
Admin applies → SuperAdmin approves → Supabase sends email →
Admin clicks link → Sets password → Redirects to /admin/dashboard
```

### Vendor/Deliverer Approval (Mobile App)
```
Vendor/Deliverer applies → Admin approves → Custom token generated →
Email sent with deep link → User clicks link → Mobile app opens →
User sets password → Redirects to dashboard
```

## What Happens When Admin Approves?

When an admin clicks "Approve" on a vendor or deliverer application (`/app/api/approve-application/route.ts`):

### Step 1: Generate Secure Token
```typescript
const inviteToken = crypto.randomBytes(32).toString("hex");
const tokenExpires = new Date();
tokenExpires.setDate(tokenExpires.getDate() + 7); // Valid for 7 days
```

### Step 2: Inherit Admin's Organization
The approved user is assigned to the same organization as the admin who approved them:
```typescript
const { data: adminProfile } = await supabaseAdmin
  .from("profiles")
  .select("organization, organization_id")
  .eq("id", adminId)
  .single();
```

### Step 3: Create Auth User (Without Password)
Creates a Supabase auth user but without a password yet:
```typescript
const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
  email: application.email,
  email_confirm: false,
  user_metadata: {
    full_name: application.full_name,
    role: application.role,
    organization_id: organizationId,
  },
});
```

### Step 4: Create Profile Record
Creates profile with invite token:
```typescript
await supabaseAdmin.from("profiles").insert({
  id: authUser.user.id,
  email: application.email,
  full_name: application.full_name,
  role: application.role,
  status: "approved",
  organization: organization,
  organization_id: organizationId,
  invite_token: inviteToken,
  invite_token_expires: tokenExpires.toISOString(),
});
```

### Step 5: Create Vendor Record (if applicable)
For vendors, creates the vendor business record:
```typescript
await supabaseAdmin.from("vendors").insert({
  id: profile.id,
  business_name: application.business_name,
  business_address: application.business_address,
  menu_summary: application.menu_summary,
  is_active: true,
});
```

### Step 6: Update Application Status
Marks the application as approved:
```typescript
await supabaseAdmin.from("applications").update({
  status: "approved",
  user_id: profile.id,
  reviewed_at: new Date().toISOString(),
  reviewed_by: adminId,
}).eq("id", applicationId);
```

### Step 7: Generate Deep Link
Creates a mobile app deep link:
```
foodies://auth/set-password?token=<64-character-hex-token>
```

## What the User Receives

### Current Implementation
The admin sees an alert with the invite link:
```
Application approved!

Invite link: foodies://auth/set-password?token=abc123...

Expires: 12/22/2025, 3:45:00 PM

Note: You should send this link to the applicant via email.
```

### Recommended: Email Integration
You should implement email sending (commented out in code):
```typescript
await sendInvitationEmail({
  to: application.email,
  name: application.full_name,
  role: application.role,
  inviteLink: inviteLink,
  expiresAt: tokenExpires,
});
```

## Mobile App Flow

### 1. User Receives Email
Email contains the deep link: `foodies://auth/set-password?token=...`

### 2. User Taps Link
- iOS/Android recognizes the `foodies://` scheme
- Opens the mobile app automatically
- Routes to the set-password screen with token in query params

### 3. User Sets Password
User enters their desired password on the set-password screen

### 4. Password Validation
The app calls `/api/auth/set-password` with:
```json
{
  "token": "abc123...",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123"
}
```

### 5. Backend Processing (`/app/api/auth/set-password/route.ts`)
- Validates token exists and hasn't expired
- Updates the auth user's password:
  ```typescript
  await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
    password: password,
    email_confirm: true,
  });
  ```
- Clears the invite token:
  ```typescript
  await supabaseAdmin.from("profiles").update({
    invite_token: null,
    invite_token_expires: null,
    status: "active",
  }).eq("id", profile.id);
  ```

### 6. User Can Now Login
User can login with their email and the password they just set.

## Database State Changes

### Before Approval
```json
// applications table
{
  "id": "uuid-1",
  "email": "vendor@example.com",
  "status": "pending",
  "role": "vendor",
  "business_name": "Joe's Pizza"
}
```

### After Admin Approves
```json
// auth.users table
{
  "id": "uuid-2",
  "email": "vendor@example.com",
  "encrypted_password": null  // No password yet!
}

// profiles table
{
  "id": "uuid-2",
  "email": "vendor@example.com",
  "role": "vendor",
  "status": "approved",
  "organization": "School District A",
  "organization_id": "org-uuid",
  "invite_token": "a1b2c3d4e5f6...",
  "invite_token_expires": "2025-12-22T15:45:00Z"
}

// vendors table
{
  "id": "uuid-2",
  "business_name": "Joe's Pizza",
  "business_address": "123 Main St",
  "is_active": true
}

// applications table (updated)
{
  "id": "uuid-1",
  "status": "approved",
  "user_id": "uuid-2",
  "reviewed_at": "2025-12-15T10:30:00Z",
  "reviewed_by": "admin-uuid"
}
```

### After User Sets Password
```json
// auth.users table (updated)
{
  "id": "uuid-2",
  "email": "vendor@example.com",
  "encrypted_password": "$2a$10$hashed_password"  // Password set!
}

// profiles table (updated)
{
  "id": "uuid-2",
  "email": "vendor@example.com",
  "role": "vendor",
  "status": "active",  // Changed from "approved"
  "invite_token": null,  // Cleared
  "invite_token_expires": null  // Cleared
}
```

## Security Features

### 1. Cryptographically Secure Tokens
- Uses `crypto.randomBytes(32)` which generates 64-character hex strings
- Virtually impossible to guess or brute force

### 2. Token Expiration
- Default: 7 days
- Checked on every set-password attempt
- Expired tokens are rejected

### 3. Single-Use Tokens
- Token cleared immediately after password is set
- Cannot be reused

### 4. Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number

### 5. Organization Isolation
- Vendors/deliverers inherit the admin's organization
- Ensures proper data isolation between schools/districts

## Error Handling

### Approval Errors
| Error | Reason |
|-------|--------|
| "Application not found" | Invalid applicationId |
| "Failed to create auth user" | Email already exists or invalid |
| "Failed to create profile" | Database constraint violation |
| "Failed to create vendor" | Missing business fields |

### Set Password Errors
| Error | Reason |
|-------|--------|
| "This invitation link is not valid" | Token doesn't exist in database |
| "This invitation link has expired" | Token expiration date passed |
| "Passwords do not match" | Password != confirmPassword |
| "Password must contain..." | Weak password |

## Next Steps

### 1. Implement Email Sending
Uncomment and implement the email sending function in `/app/api/approve-application/route.ts`:
```typescript
await sendInvitationEmail({
  to: application.email,
  name: application.full_name,
  role: application.role,
  inviteLink: inviteLink,
  expiresAt: tokenExpires,
});
```

Options:
- **Resend** (recommended): Simple API, good deliverability
- **SendGrid**: Robust, enterprise-ready
- **AWS SES**: Cost-effective for high volume
- **Supabase Auth**: Built-in, but may need custom templates

### 2. Update Mobile App
Ensure your mobile app:
- Has `foodies://` URL scheme registered
- Routes `auth/set-password` to the password setup screen
- Extracts token from query params
- Calls `/api/auth/set-password` endpoint

### 3. Test End-to-End
1. Submit a vendor application
2. Admin approves it
3. Copy the invite link
4. Test it in your mobile app (or web for testing)
5. Set a password
6. Verify user can login

## Differences from Admin Approval

| Aspect | Admin | Vendor/Deliverer |
|--------|-------|------------------|
| Approved by | SuperAdmin | Admin |
| Invite method | Supabase inviteUserByEmail | Custom token |
| Platform | Web | Mobile app |
| Deep link | /auth/callback | foodies://auth/set-password |
| Organization | Creates new org | Inherits admin's org |
| Additional records | None | vendors table (for vendors) |
| Email sent by | Supabase | Your implementation (TODO) |

## Files Modified

1. `/app/api/approve-application/route.ts` - Split into two flows
2. `/app/admin/dashboard/page.tsx` - Pass adminId, show invite link
3. `/app/api/auth/set-password/route.ts` - Already implemented (handles token validation)

## Rollback Strategy

Each step includes rollback logic:
- If profile creation fails → delete auth user
- If vendor creation fails → delete profile and auth user
- Ensures no orphaned records in database
