/*
  # Cafe source-of-truth tables, photo cache, and text-search cache

  Makes Supabase the source of truth for cafe data so Google Places is only
  hit on a cache miss (behind Edge Functions). Adds:
    - `cafes`            canonical cafe records keyed by Google place_id, with a
                         PostGIS geography point for nearby queries and trigram
                         indexes for fuzzy text search.
    - `cafe_photos`      cached Place Photos stored in Supabase Storage so list
                         images are served from our bucket, not billed Google
                         photo requests on every render.
    - `text_search_cache` maps a normalized text query to the place_ids it
                         resolved to, so repeated searches dedupe to the DB.
    - a public `cafe-photos` Storage bucket.
*/

-- Extensions ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- cafes
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cafes (
  place_id text PRIMARY KEY,
  name text,
  formatted_address text,
  rating numeric,
  latitude double precision,
  longitude double precision,
  geom geography(Point, 4326),
  phone text,
  opening_hours jsonb,
  types text[],
  amenities text[],
  thumbnail_url text,
  details_fetched_at timestamptz,
  details_expires_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cafes_geom ON public.cafes USING gist (geom);
CREATE INDEX IF NOT EXISTS idx_cafes_name_trgm
  ON public.cafes USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cafes_address_trgm
  ON public.cafes USING gin (formatted_address gin_trgm_ops);

ALTER TABLE public.cafes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read cafes" ON public.cafes;
CREATE POLICY "Anyone can read cafes" ON public.cafes FOR SELECT USING (true);

-- Keep geom in sync with latitude/longitude so Edge Functions only need to
-- write the plain coordinate columns.
CREATE OR REPLACE FUNCTION public.cafes_set_geom()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF new.latitude IS NOT NULL AND new.longitude IS NOT NULL THEN
    new.geom := ST_SetSRID(ST_MakePoint(new.longitude, new.latitude), 4326)::geography;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_cafes_set_geom ON public.cafes;
CREATE TRIGGER trg_cafes_set_geom
  BEFORE INSERT OR UPDATE ON public.cafes
  FOR EACH ROW
  EXECUTE FUNCTION public.cafes_set_geom();

DROP TRIGGER IF EXISTS update_cafes_updated_at ON public.cafes;
CREATE TRIGGER update_cafes_updated_at
  BEFORE UPDATE ON public.cafes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Nearby lookup ordered by distance. Returns plain columns (no geom) so the
-- result serializes cleanly over PostgREST/supabase-js.
CREATE OR REPLACE FUNCTION public.cafes_nearby(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters double precision,
  p_limit integer DEFAULT 30
)
RETURNS TABLE (
  place_id text,
  name text,
  formatted_address text,
  rating numeric,
  latitude double precision,
  longitude double precision,
  phone text,
  opening_hours jsonb,
  types text[],
  amenities text[],
  thumbnail_url text,
  details_fetched_at timestamptz,
  details_expires_at timestamptz,
  distance_meters double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    c.place_id,
    c.name,
    c.formatted_address,
    c.rating,
    c.latitude,
    c.longitude,
    c.phone,
    c.opening_hours,
    c.types,
    c.amenities,
    c.thumbnail_url,
    c.details_fetched_at,
    c.details_expires_at,
    ST_Distance(c.geom, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) AS distance_meters
  FROM public.cafes c
  WHERE c.geom IS NOT NULL
    AND ST_DWithin(c.geom, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_meters)
  ORDER BY c.geom <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  LIMIT p_limit;
$$;

-- =====================================================
-- cafe_photos
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cafe_photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id text NOT NULL REFERENCES public.cafes(place_id) ON DELETE CASCADE,
  photo_reference text,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  width integer,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT cafe_photos_place_position_unique UNIQUE (place_id, position)
);

CREATE INDEX IF NOT EXISTS idx_cafe_photos_place_id ON public.cafe_photos(place_id);

ALTER TABLE public.cafe_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read cafe photos" ON public.cafe_photos;
CREATE POLICY "Anyone can read cafe photos" ON public.cafe_photos FOR SELECT USING (true);

-- =====================================================
-- text_search_cache
-- =====================================================
CREATE TABLE IF NOT EXISTS public.text_search_cache (
  query_key text PRIMARY KEY,
  place_ids text[] NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_text_search_cache_expires_at
  ON public.text_search_cache(expires_at);

ALTER TABLE public.text_search_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read text search cache" ON public.text_search_cache;
CREATE POLICY "Anyone can read text search cache" ON public.text_search_cache FOR SELECT USING (true);

DROP TRIGGER IF EXISTS update_text_search_cache_updated_at ON public.text_search_cache;
CREATE TRIGGER update_text_search_cache_updated_at
  BEFORE UPDATE ON public.text_search_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Storage bucket for cached cafe photos
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('cafe-photos', 'cafe-photos', true)
ON CONFLICT (id) DO NOTHING;
