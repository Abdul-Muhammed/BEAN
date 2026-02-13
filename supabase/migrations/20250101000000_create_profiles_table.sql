/*
  # Create Profiles Table
  
  Creates the profiles table with all necessary columns for user profiles.
*/

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id text UNIQUE NOT NULL,
  username text NOT NULL,
  first_name text,
  last_name text,
  email text NOT NULL,
  location_address text,
  preferences text[] DEFAULT '{}',
  profile_image_url text,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create unique index on clerk_user_id for faster lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_clerk_user_id_unique ON profiles(clerk_user_id);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON profiles;

-- Create RLS policies
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

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

