/*
  # Create Nearby Places Cache

  Stores rounded Google Places Nearby Search responses so users viewing the
  same map area can share cached results through the Edge Function.
*/

CREATE TABLE IF NOT EXISTS public.nearby_places_cache (
  cache_key text PRIMARY KEY,
  center_latitude numeric NOT NULL,
  center_longitude numeric NOT NULL,
  radius_meters integer NOT NULL,
  max_pages integer NOT NULL CHECK (max_pages >= 1 AND max_pages <= 2),
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nearby_places_cache_expires_at
  ON public.nearby_places_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_nearby_places_cache_lookup
  ON public.nearby_places_cache(center_latitude, center_longitude, radius_meters, max_pages);

ALTER TABLE public.nearby_places_cache ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_nearby_places_cache_updated_at ON public.nearby_places_cache;
CREATE TRIGGER update_nearby_places_cache_updated_at
  BEFORE UPDATE ON public.nearby_places_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
