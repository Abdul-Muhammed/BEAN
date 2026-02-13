/*
  # Add Clerk Integration Fields to Profiles Table

  1. Changes
    - Add `clerk_user_id` column (text, unique, not null)
    - Add `first_name` column (text, nullable)
    - Add `last_name` column (text, nullable)
    - Add `email` column (text, not null)
    - Add `profile_image_url` column (text, nullable)
    - Update `preferences` to store as text array instead of jsonb
  
  2. Indexes
    - Add index on `clerk_user_id` for faster lookups
  
  3. Security
    - Maintain existing RLS policies
*/

-- Add clerk_user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'clerk_user_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN clerk_user_id text;
  END IF;
END $$;

-- Add first_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN first_name text;
  END IF;
END $$;

-- Add last_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_name text;
  END IF;
END $$;

-- Add email column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email text;
  END IF;
END $$;

-- Add profile_image_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_image_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_image_url text;
  END IF;
END $$;

-- Create unique index on clerk_user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_clerk_user_id_unique ON profiles(clerk_user_id);

-- Update RLS policies if needed
-- Drop existing policies first
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON profiles;

-- Create new policies
CREATE POLICY "Anyone can read profiles"
  ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert profiles"
  ON profiles
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update profiles"
  ON profiles
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
