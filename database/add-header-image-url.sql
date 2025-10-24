-- Migration: Add header_image_url to profiles table
-- Description: Adds header/banner image support for admin organizations

-- Add header_image_url column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS header_image_url text;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.header_image_url IS 'Header/banner image URL for organization branding (displayed to customers)';
