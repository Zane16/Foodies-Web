-- Migration: Add invite token columns to profiles table
-- This enables the secure invite flow where users set their own passwords

-- Add invite_token column (stores the secure token for password setup)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS invite_token TEXT;

-- Add invite_token_expires column (stores when the token expires)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS invite_token_expires TIMESTAMPTZ;

-- Add status column to track profile state (pending, approved, active, etc.)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Create index on invite_token for faster lookups during password setup
CREATE INDEX IF NOT EXISTS idx_profiles_invite_token ON profiles(invite_token) WHERE invite_token IS NOT NULL;

-- Create index on status for filtering users by status
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Add comment for documentation
COMMENT ON COLUMN profiles.invite_token IS 'Secure token sent via email for password setup. Cleared after password is set.';
COMMENT ON COLUMN profiles.invite_token_expires IS 'Expiration timestamp for invite token (typically 7 days from creation)';
COMMENT ON COLUMN profiles.status IS 'User status: pending (awaiting approval), approved (invited but no password), active (has set password), inactive';
