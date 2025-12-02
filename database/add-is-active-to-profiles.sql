-- Migration: Use existing status field for account activation
-- Description: The profiles table already has a 'status' field that can be used for account management
--              Status values: 'pending', 'approved', 'declined'
--              We'll use 'declined' to represent deactivated accounts

-- Note: No schema changes needed.
-- The existing 'status' field in profiles table will be used as follows:
-- - 'approved' = active account
-- - 'declined' = deactivated account (removed from display)
-- - 'pending' = awaiting approval

-- Create index on status field for better performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles(role, status);
