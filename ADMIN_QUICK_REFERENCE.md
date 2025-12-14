# Quick Reference: Magic Link for Admin

## What Magic Link to Send

When you approve a vendor/deliverer on the web admin panel, use this code to send them a magic link:

```javascript
// In your admin web application
const { data, error } = await supabase.auth.resetPasswordForEmail(
  vendorEmail, // The vendor's email address
  {
    redirectTo: 'foodies://auth/set-password'
  }
)

if (error) {
  console.error('Failed to send magic link:', error)
  alert('Failed to send approval email')
} else {
  alert('Approval email sent successfully!')
}
```

## That's It!

The vendor will receive an email with a link that:
1. Opens the Foodies mobile app
2. Takes them to a "Set Password" screen
3. After setting password, they're logged in automatically
4. Redirected to the app home screen

---

## Example: Complete Approval Flow

```javascript
async function approveVendor(vendorId, vendorEmail) {
  try {
    // 1. Update vendor status in database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ status: 'approved' })
      .eq('id', vendorId)

    if (updateError) throw updateError

    // 2. Send magic link email
    const { error: emailError } = await supabase.auth.resetPasswordForEmail(
      vendorEmail,
      { redirectTo: 'foodies://auth/set-password' }
    )

    if (emailError) throw emailError

    alert('Vendor approved and email sent!')

  } catch (error) {
    console.error('Approval failed:', error)
    alert('Failed to approve vendor: ' + error.message)
  }
}
```

---

## Important: Supabase Setup

Make sure these URLs are added to Supabase:

**Dashboard → Authentication → URL Configuration → Redirect URLs:**
```
foodies://auth/callback
foodies://auth/set-password
```

---

## Testing

Test with your own email first:
```javascript
await supabase.auth.resetPasswordForEmail('your-email@example.com', {
  redirectTo: 'foodies://auth/set-password'
})
```

Check your email and click the link to make sure it opens the app correctly.
