# Database Schema

## Tables

### applications
- `id` (uuid, PK)
- `user_id` (uuid, FK to auth.users)
- `full_name` (text, NOT NULL)
- `email` (text, NOT NULL, validated)
- `role` (text, NOT NULL) - 'vendor', 'deliverer', or 'admin'
- `status` (text, DEFAULT 'pending') - 'pending', 'approved', or 'declined'
- `organization` (text)
- `notes` (text)
- `document_urls` (jsonb, DEFAULT '[]')
- `business_name` (text) - for vendors
- `business_address` (text) - for vendors
- `menu_summary` (text) - for vendors
- `vehicle_type` (text) - for deliverers
- `availability` (text) - for deliverers
- `created_at` (timestamp with time zone, DEFAULT now())
- `reviewed_at` (timestamp with time zone)
- `reviewed_by` (uuid, FK to profiles)

### categories
- `id` (uuid, PK)
- `vendor_id` (uuid, FK to vendors, NOT NULL)
- `name` (text, NOT NULL)
- `display_order` (integer, DEFAULT 0)
- `is_active` (boolean, DEFAULT true)
- `created_at` (timestamp with time zone, DEFAULT now())
- `updated_at` (timestamp with time zone, DEFAULT now())

### menu_items
- `id` (uuid, PK)
- `vendor_id` (uuid, FK to vendors, NOT NULL)
- `category_id` (uuid, FK to categories)
- `name` (text, NOT NULL)
- `description` (text)
- `price` (numeric, NOT NULL, CHECK >= 0)
- `image_url` (text)
- `is_available` (boolean, DEFAULT true)
- `created_at` (timestamp with time zone, DEFAULT now())
- `updated_at` (timestamp with time zone, DEFAULT now())
- `is_best_seller` (boolean, DEFAULT false)
- `is_recommended` (boolean, DEFAULT false)

### messages
- `id` (uuid, PK)
- `order_id` (uuid, FK to orders, NOT NULL)
- `sender_id` (uuid, FK to profiles, NOT NULL)
- `message` (text, NOT NULL)
- `created_at` (timestamp with time zone, DEFAULT now())
- `read` (boolean, DEFAULT false)

### orders
- `id` (uuid, PK)
- `customer_id` (uuid, FK to profiles, NOT NULL)
- `vendor_id` (uuid, FK to vendors, NOT NULL)
- `deliverer_id` (uuid, FK to profiles)
- `items` (jsonb, NOT NULL)
- `total_price` (numeric, NOT NULL, CHECK >= 0)
- `status` (text, DEFAULT 'pending') - 'pending', 'preparing', 'ready', 'accepted', 'on_the_way', 'delivered', 'completed', 'cancelled'
- `delivery_address` (text)
- `delivery_notes` (text)
- `created_at` (timestamp with time zone, DEFAULT now())
- `prepared_at` (timestamp with time zone)
- `accepted_at` (timestamp with time zone)
- `delivered_at` (timestamp with time zone)
- `completed_at` (timestamp with time zone)
- `customer_name` (text)
- `customer_phone` (text)
- `delivery_fee` (numeric, DEFAULT 0)
- `delivery_latitude` (numeric)
- `delivery_longitude` (numeric)
- `pickup_latitude` (numeric)
- `pickup_longitude` (numeric)

### profiles
- `id` (uuid, PK, FK to auth.users)
- `role` (text, NOT NULL) - 'customer', 'vendor', 'deliverer', 'admin', 'superadmin'
- `full_name` (text)
- `email` (text, NOT NULL, validated)
- `organization` (text, DEFAULT 'global')
- `created_at` (timestamp with time zone, DEFAULT now())
- `updated_at` (timestamp with time zone, DEFAULT now())
- **`status` (text, DEFAULT 'pending') - 'pending', 'approved', 'declined'**
- `phone` (text)
- `delivery_address` (text)
- `delivery_notes` (text)
- `latitude` (numeric)
- `longitude` (numeric)
- `profile_picture_url` (text)
- `header_image_url` (text)

### ratings
- `id` (uuid, PK)
- `order_id` (uuid, FK to orders, NOT NULL)
- `customer_id` (uuid, FK to profiles, NOT NULL)
- `rated_entity_id` (uuid, NOT NULL)
- `rating` (integer, NOT NULL, CHECK 1-5)
- `comment` (text)
- `type` (text, NOT NULL) - 'vendor' or 'deliverer'
- `created_at` (timestamp with time zone, DEFAULT now())
- `updated_at` (timestamp with time zone, DEFAULT now())

### vendors
- `id` (uuid, PK, FK to profiles)
- `business_name` (text, NOT NULL)
- `business_address` (text)
- `menu_summary` (text)
- `is_active` (boolean, DEFAULT true)
- `created_at` (timestamp with time zone, DEFAULT now())
- `updated_at` (timestamp with time zone, DEFAULT now())
- `delivery_fee` (numeric, DEFAULT 0, CHECK >= 0)
- `minimum_order` (numeric, DEFAULT 0, CHECK >= 0)
- `header_image_url` (text)
- `latitude` (numeric)
- `longitude` (numeric)

## Key Notes

1. **profiles.status** - This is the key field for determining if a user is approved
   - 'pending' - User account created but not yet approved
   - 'approved' - User has been approved and can access the system
   - 'declined' - User application was declined

2. **vendors.is_active** - Separate from profile status, this controls if a vendor's business is active

3. **Organization-based filtering** - Most queries should filter by organization to show only relevant data to admins
