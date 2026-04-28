/*
  # Add Coordinate Columns to Profiles

  Stores the latitude/longitude captured during onboarding so the app can
  query nearby cafes via Google Places without re-geocoding the saved
  address every time.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'location_latitude'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN location_latitude double precision;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'location_longitude'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN location_longitude double precision;
  END IF;
END $$;
