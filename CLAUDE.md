# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Foodies is a Next.js 14 application for school food ordering that manages vendors, delivery riders, and administrators. The platform uses Supabase for authentication and database operations.

## Development Commands

### Running the Application
```bash
npm run dev       # Start development server (listens on all network interfaces: 0.0.0.0)
npm run build     # Build for production
npm start         # Start production server
npm run lint      # Run ESLint (note: errors ignored during builds)
```

### Build Configuration Notes
- TypeScript and ESLint errors are ignored during builds (see next.config.mjs)
- Images are unoptimized
- SUPABASE_SERVICE_ROLE_KEY is exposed via env config

## Architecture Overview

### Multi-Role System
The application has four distinct user roles, each with separate authentication flows and dashboards:

1. **SuperAdmin** (`/SuperAdmin/*`)
   - Top-level administrative access
   - Route protection via `app/SuperAdmin/dashboard/protectRoute.tsx`
   - Checks user role from `profiles` table in Supabase

2. **Admin** (`/admin/*`)
   - Reviews and approves/declines vendor and deliverer applications
   - Manages active vendors
   - Main dashboard: `app/admin/dashboard/page.tsx`

3. **Vendor** (`/vendor/*`)
   - Manages menus and food orders
   - Application form at `/admin/ApplicationForm/page.tsx`

4. **Rider** (`/rider/*`)
   - Delivery personnel
   - Views assignments and earnings

### Authentication & Database

**Supabase Client Configuration** (`supabaseClient.ts`):
- Single client instance using anon key
- Environment variables required:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)

**Database Schema** (organized and normalized):

The database follows a clean, normalized structure with proper relationships:

**Core Tables:**

1. **`profiles`** - Central user registry (extends `auth.users`)
   - `id` (uuid, FK to auth.users) - Primary key
   - `role` - One of: customer, vendor, deliverer, admin, superadmin
   - `full_name`, `email`, `organization`
   - `created_at`, `updated_at` (auto-updated via trigger)
   - **Indexes**: role, email, organization, created_at

2. **`applications`** - Unified application system for all roles
   - Supports vendor, deliverer, and admin applications in one table
   - `role` - vendor, deliverer, or admin
   - `status` - pending, approved, or declined
   - Common fields: `full_name`, `email`, `organization`, `notes`, `document_urls` (jsonb array)
   - Vendor fields: `business_name`, `business_address`, `menu_summary`
   - Deliverer fields: `vehicle_type`, `availability`
   - Audit fields: `reviewed_at`, `reviewed_by` (FK to profiles)
   - **Indexes**: status, role, email, created_at, organization (partial)
   - **View**: `pending_applications` - Shows pending apps with hours_pending calculation

3. **`vendors`** - Approved vendor business information (extends profiles)
   - `id` (uuid, FK to profiles) - Only users with role='vendor' can have vendor records
   - `business_name`, `business_address`, `menu_summary`
   - `is_active` - Soft delete flag
   - `created_at`, `updated_at`
   - **Indexes**: is_active, business_name
   - **View**: `vendor_summary` - Aggregates vendor stats (available_items, total_items, total_categories)

4. **`categories`** - Menu categories per vendor
   - `vendor_id` (FK to vendors)
   - `name`, `display_order`, `is_active`
   - **Indexes**: vendor_id, (vendor_id + display_order), (vendor_id + is_active)

5. **`menu_items`** - Food items offered by vendors
   - `vendor_id` (FK to vendors), `category_id` (FK to categories, nullable)
   - `name`, `description`, `price` (numeric, >= 0), `image_url`
   - `is_available` - Item availability toggle
   - `created_at`, `updated_at`
   - **Indexes**: vendor_id, category_id, (vendor_id + is_available), name

6. **`orders`** - Customer orders with full lifecycle tracking
   - `customer_id`, `vendor_id`, `deliverer_id` (all FK to profiles)
   - `items` (jsonb) - Array of order items with menu_item_id, name, price, quantity
   - `total_price` (numeric, >= 0)
   - `status` - pending → preparing → ready → accepted → on_the_way → delivered → completed (or cancelled)
   - `delivery_address`, `delivery_notes`
   - Timestamps: `created_at`, `prepared_at`, `accepted_at`, `delivered_at`, `completed_at`
   - **Indexes**: Multiple composite indexes for customer/vendor/deliverer queries by status and date
   - **View**: `order_details` - Joins all related info (customer, vendor, deliverer names/emails)

**Database Triggers:**
- Auto-update `updated_at` columns on profiles, vendors, and menu_items tables

**Key Design Principles:**
- Single source of truth: No duplicate data between tables
- Proper normalization: vendors extend profiles, not separate auth
- Unified applications: All role applications in one table
- Soft deletes: `is_active` flags instead of hard deletes
- Audit trails: `reviewed_by`, `reviewed_at` on applications
- Performance: Strategic indexes on all foreign keys and query patterns

### API Routes Structure

All API routes are in `app/api/`:
- `/api/applications` - GET pending applications, POST new applications
- `/api/approve-application` - POST to approve and create vendor account
- `/api/decline-application` - POST to decline application
- `/api/vendors` - GET active vendors
- `/api/submit-admin-application` - Submit admin application form

**Important**: API routes use `createClient()` with service role key for privileged operations (bypasses RLS).

### File Upload System

Applications support multiple document uploads stored in Supabase Storage. The `document_urls` field stores an array of public URLs that can be directly accessed without signed URL generation.

### UI Component Library

Uses shadcn/ui components located in `components/ui/`:
- Built on Radix UI primitives
- Styled with Tailwind CSS v4 (using `@tailwindcss/postcss`)
- Utility function `cn()` in `lib/utils.ts` combines clsx and tailwind-merge

### Styling System

**Tailwind CSS v4 Configuration**:
- No separate config file (uses CSS-based configuration)
- Theme defined in `app/globals.css` using `@theme inline`
- Custom CSS properties for colors (using oklch color space)
- Dark mode support via `.dark` class
- Custom animations: `animate-fade-in`, `animate-slide-up`, `animate-scale-in`

**Fonts**:
- Geist Sans (variable font)
- Geist Mono (variable font)
- Configured in root layout

### Form Handling

Forms use `react-hook-form` with Zod validation:
- Form components in `components/ui/form.tsx`
- Integration with shadcn/ui form primitives
- Resolver package: `@hookform/resolvers`

### Path Aliases

TypeScript path alias `@/*` maps to root directory (configured in tsconfig.json).

## Important Implementation Details

### Route Protection Pattern
Protected routes use client-side authentication checks:
```typescript
// Check user session
const { data: { user } } = await supabase.auth.getUser()
// Fetch user profile and verify role
const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
// Redirect if unauthorized
```

### Application Review Workflow
1. User submits application via form (vendor/deliverer)
2. Admin reviews in dashboard (`/admin/dashboard`)
3. On approval:
   - Creates auth user account
   - Updates application status
   - Sends credentials (implementation varies by role)
4. On decline:
   - Updates status to declined
   - Removes from pending list

### Document Handling
Documents are uploaded to Supabase Storage and stored as public URLs. No signed URL generation is needed for display - URLs are directly accessible.

## Common Gotchas

1. **Import Paths**: Always use `@/` prefix for imports (e.g., `@/components/ui/button`)
2. **Supabase Client**: Use service role key only in API routes, never in client components
3. **Form Validation**: Zod schemas should match API payload structure
4. **Role-Based Access**: Always verify role from `profiles` table, not just auth status
5. **TypeScript/ESLint**: Build errors are suppressed - fix them proactively for code quality
