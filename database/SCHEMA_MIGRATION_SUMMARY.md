# Schema Migration Summary

## Changes Made

### 1. API Routes Updated

#### `/api/approve-application` (route.ts:1)
- ✅ Now creates profile for ALL roles (vendor, deliverer, admin)
- ✅ Profiles include: id, role, full_name, email, organization
- ✅ Vendors get additional record in `vendors` table with `id` (not `auth_user_id`)
- ✅ Added audit trail: `reviewed_at`, `reviewed_by`
- ✅ Vendors table uses `id` as FK to profiles (not `auth_user_id`)

#### `/api/decline-application` (route.ts:1)
- ✅ Added audit trail: `reviewed_at`, `reviewed_by`
- ✅ Works with unified applications table

#### `/api/vendors` (route.ts:1)
- ✅ Now uses `vendor_summary` view for efficient queries
- ✅ Returns: full_name, email, business_name, total_items, available_items, total_categories
- ✅ Filters only active vendors (`is_active = true`)

#### `/api/vendors/[id]` (route.ts:1)
- ✅ Soft delete: sets `is_active = false` instead of hard delete
- ✅ Preserves data integrity

#### `/api/submit-admin-application` (route.ts:1)
- ✅ Now inserts into unified `applications` table with `role='admin'`
- ✅ No longer uses separate `admin_applications` table

### 2. Admin Dashboard Updated

#### `app/admin/dashboard/page.tsx`
- ✅ Updated Vendor interface to match `vendor_summary` view
- ✅ Shows menu item statistics (available_items / total_items)
- ✅ Displays business_name and full_name separately
- ✅ "Remove" button now says "Deactivate Vendor" (soft delete)

### 3. SuperAdmin Dashboard Updated

#### `app/SuperAdmin/dashboard/page.tsx`
- ✅ Fetches from unified `applications` table filtered by `role='admin'`
- ✅ Updated document handling for array format
- ✅ Document URLs are now direct public URLs (no storage.getPublicUrl needed)
- ✅ Updated AdminApplication interface for new schema
- ✅ Decline function now calls API route for audit trail

## Schema Design Highlights

### Unified Applications Table
- Single table for vendor, deliverer, and admin applications
- Role-specific fields: business_name (vendor), vehicle_type (deliverer)
- Audit fields: reviewed_at, reviewed_by
- document_urls is now a JSON array of public URLs

### Profiles as Central Registry
- All users have a profile record
- Stores: id (FK to auth.users), role, full_name, email, organization
- Vendors extend profiles with additional business info

### Vendors Table
- `id` is FK to profiles (NOT auth.users)
- Includes: business_name, business_address, menu_summary
- `is_active` for soft deletes
- Auto-updated `updated_at` via trigger

### Database Views
- `vendor_summary`: Aggregates vendor stats with menu item counts
- `pending_applications`: Shows pending apps with hours_pending calculation
- `order_details`: Joins customer, vendor, deliverer info

## Testing Checklist

- [ ] Admin can view pending vendor/deliverer applications
- [ ] Admin can approve vendor application (creates profile + vendor record)
- [ ] Admin can approve deliverer application (creates profile only)
- [ ] Admin can decline applications (with audit trail)
- [ ] Admin can view active vendors with menu stats
- [ ] Admin can deactivate vendors (soft delete)
- [ ] SuperAdmin can view pending admin applications
- [ ] SuperAdmin can approve admin applications
- [ ] SuperAdmin can decline admin applications
- [ ] SuperAdmin can manage existing admins
- [ ] Document uploads display correctly (array of URLs)

## Migration Notes

### If Migrating Existing Data:

1. **Old admin_applications → New applications**
   ```sql
   INSERT INTO applications (id, email, role, organization, document_urls, status, created_at, full_name)
   SELECT id, email, 'admin', organization, document_urls, status, created_at, organization
   FROM admin_applications;
   ```

2. **Old vendors table → New structure**
   ```sql
   -- First ensure profiles exist for all vendors
   INSERT INTO profiles (id, role, full_name, email, organization)
   SELECT auth_user_id, 'vendor', name, email, 'global'
   FROM vendors WHERE auth_user_id IS NOT NULL;

   -- Then update vendors to use profile id
   UPDATE vendors v
   SET id = auth_user_id
   WHERE auth_user_id IS NOT NULL;
   ```

3. **Drop old columns**
   ```sql
   ALTER TABLE vendors DROP COLUMN IF EXISTS auth_user_id;
   ALTER TABLE vendors DROP COLUMN IF EXISTS status;
   ALTER TABLE profiles DROP COLUMN IF EXISTS vendor_name;
   ```

## Environment Variables Required

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Key Behavioral Changes

1. **Vendor removal is now soft delete** - Sets `is_active = false` instead of deleting
2. **All applications in one table** - Filter by `role` column
3. **Document URLs are public** - No need for signed URL generation
4. **Audit trail on applications** - Track who reviewed and when
5. **Vendor stats available** - Use `vendor_summary` view for dashboard
