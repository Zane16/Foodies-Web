# Web-Based Approval Flow for Vendors/Deliverers

## Overview

When a vendor or deliverer application is approved, they receive an email from Supabase with a confirmation link that redirects to your web application at `https://foodies-web-gamma.vercel.app`.

## Implementation Steps

### 1. Configure Supabase Authentication Settings

#### A. Set Site URL
1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Set **Site URL** to:
   ```
   https://foodies-web-gamma.vercel.app
   ```

#### B. Add Redirect URLs
Add these allowed redirect URLs:
```
https://foodies-web-gamma.vercel.app/auth/callback
https://foodies-web-gamma.vercel.app/**
```

#### C. Configure Email Templates
1. Go to **Authentication** → **Email Templates**
2. Select **Invite user** template
3. Customize the email body (example):
   ```html
   <h2>Welcome to Foodies!</h2>
   <p>Hi {{ .Name }},</p>
   <p>Your {{ .Role }} application has been approved!</p>
   <p>Click the link below to confirm your email and set your password:</p>
   <p><a href="{{ .ConfirmationURL }}">Confirm Email & Set Password</a></p>
   <p>This link expires in 24 hours.</p>
   ```

### 2. Update Your Backend Approval Code

In your backend API route (where you approve applications), replace the custom token approach with Supabase's built-in invite:

```typescript
// app/api/approve-application/route.ts (or similar)

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: Request) {
  try {
    const { applicationId, adminId } = await request.json();

    // 1. Fetch the application
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return Response.json({ error: 'Application not found' }, { status: 404 });
    }

    // 2. Get admin's organization (for inheritance)
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization, organization_id')
      .eq('id', adminId)
      .single();

    const organization = adminProfile?.organization || 'global';
    const organizationId = adminProfile?.organization_id;

    // 3. Invite user via Supabase (sends email automatically)
    const { data: authUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      application.email,
      {
        data: {
          full_name: application.full_name,
          role: application.role,
          organization: organization,
          organization_id: organizationId,
        },
        redirectTo: 'https://foodies-web-gamma.vercel.app/auth/callback'
      }
    );

    if (inviteError || !authUser.user) {
      throw new Error(`Failed to invite user: ${inviteError?.message}`);
    }

    // 4. Create profile record
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email: application.email,
        full_name: application.full_name,
        role: application.role,
        status: 'approved',
        organization: organization,
        organization_id: organizationId,
      })
      .select()
      .single();

    if (profileError) {
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    // 5. If vendor, create vendor record
    if (application.role === 'vendor') {
      const { error: vendorError } = await supabaseAdmin
        .from('vendors')
        .insert({
          id: profile.id,
          business_name: application.business_name || application.full_name,
          business_address: application.business_address,
          menu_summary: application.menu_summary,
          is_active: true,
        });

      if (vendorError) {
        // Rollback: delete profile and auth user
        await supabaseAdmin.from('profiles').delete().eq('id', profile.id);
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        throw new Error(`Failed to create vendor: ${vendorError.message}`);
      }
    }

    // 6. Update application status
    await supabaseAdmin
      .from('applications')
      .update({
        status: 'approved',
        user_id: profile.id,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
      })
      .eq('id', applicationId);

    return Response.json({
      success: true,
      message: 'Application approved. Invitation email sent to user.',
      userId: profile.id
    });

  } catch (error: any) {
    console.error('Approval error:', error);
    return Response.json(
      { error: error.message || 'Failed to approve application' },
      { status: 500 }
    );
  }
}
```

### 3. Web Application Flow

Your web app (`https://foodies-web-gamma.vercel.app`) needs these routes:

#### A. `/auth/callback` - Handle Email Confirmation
This page handles the redirect from the email link:

```typescript
// app/auth/callback/page.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Handle the auth callback
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Fetch user profile to determine role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', session.user.id)
          .single();

        if (profile?.status === 'approved') {
          // Redirect to password setup or dashboard based on role
          if (profile.role === 'vendor') {
            router.push('/vendor/dashboard');
          } else if (profile.role === 'deliverer') {
            router.push('/deliverer/dashboard');
          } else {
            router.push('/dashboard');
          }
        }
      }
    });
  }, [router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div>
        <h2>Confirming your email...</h2>
        <p>Please wait while we verify your account.</p>
      </div>
    </div>
  );
}
```

#### B. Password Setup (Optional)
Supabase's invite flow allows users to set their password during email confirmation. However, if you want a custom password setup page:

```typescript
// app/auth/set-password/page.tsx

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function SetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    // Fetch user profile to redirect to correct dashboard
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'vendor') {
        router.push('/vendor/dashboard');
      } else if (profile?.role === 'deliverer') {
        router.push('/deliverer/dashboard');
      }
    }
  };

  return (
    <div>
      <h2>Set Your Password</h2>
      <form onSubmit={handleSetPassword}>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Setting password...' : 'Set Password'}
        </button>
      </form>
    </div>
  );
}
```

### 4. Mobile App Considerations

Once users are approved and set their password on the web:
- They can download the mobile app
- Login with their email and password
- Access role-specific features (vendor or deliverer tabs)

The mobile app login flow (app/auth/login.tsx) already handles this correctly.

## Complete User Journey

1. **User applies** → Submits application via mobile app or web
2. **Admin approves** → Clicks "Approve" in admin dashboard
3. **Supabase sends email** → User receives invitation email
4. **User clicks link** → Opens `https://foodies-web-gamma.vercel.app/auth/callback`
5. **Email confirmed** → Supabase verifies email
6. **User sets password** → Either in email flow or on custom page
7. **Redirected to dashboard** → Based on role (vendor/deliverer)
8. **Can use mobile app** → Login with email/password

## Benefits of This Approach

✅ **Automatic email sending** - No need to implement custom email service
✅ **Secure token handling** - Supabase manages all security
✅ **Email verification** - Built-in email confirmation
✅ **Password reset** - Users can reset password via standard Supabase flow
✅ **Web-first onboarding** - Better UX for setting up account
✅ **Mobile app ready** - Users can login immediately after setup

## Testing

1. Create a test application in your system
2. Approve it using the admin dashboard
3. Check the email (use a real email or Supabase email testing)
4. Click the confirmation link
5. Verify redirect to your web app
6. Set password and confirm login works
7. Test mobile app login with same credentials

## Environment Variables Needed

Make sure these are set in your backend:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Troubleshooting

### Email not received
- Check Supabase email rate limits
- Verify email templates are enabled
- Check spam folder
- Use Supabase's email testing feature

### Redirect not working
- Confirm redirect URL is in allowed list
- Check Site URL configuration
- Verify `redirectTo` parameter in invite call

### Password not setting
- Check password requirements (min 8 chars by default)
- Verify user has confirmed email first
- Check browser console for errors
