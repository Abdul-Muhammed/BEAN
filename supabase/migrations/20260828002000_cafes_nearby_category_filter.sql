/*
  # cafes_nearby: category filtering, tags, and rating volume

  Filtering by community tags has to happen server-side. Doing it on the client
  meant a filtered result could only ever be a subset of the ~20-40 cafes
  already fetched for the current viewport, so a halal cafe three streets away
  was invisible no matter what the user selected.

  Also adds `cafes.user_ratings_total`, so "top rated" can mean something other
  than a 5.0 from two ratings.
*/

-- =====================================================
-- cafes.user_ratings_total
-- =====================================================
ALTER TABLE public.cafes
  ADD COLUMN IF NOT EXISTS user_ratings_total integer;

-- =====================================================
-- cafes_nearby
-- =====================================================
-- The return type and arity both change, so the old signature is dropped
-- explicitly. Leaving it in place would make cafes_nearby(a,b,c,d) ambiguous
-- between the two overloads.
DROP FUNCTION IF EXISTS public.cafes_nearby(
  double precision, double precision, double precision, integer
);

CREATE OR REPLACE FUNCTION public.cafes_nearby(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters double precision,
  p_limit integer DEFAULT 30,
  -- NULL means "no category filter". A non-empty array matches cafes carrying
  -- ANY of the listed categories: with a 5-tag-per-review cap and community
  -- data just starting, requiring ALL of them would return an empty list
  -- almost every time.
  p_category_ids text[] DEFAULT NULL,
  -- How many distinct people must have applied a tag for it to count. 1 while
  -- the tag graph is young; raise here to demand corroboration, no schema
  -- change or backfill needed.
  p_min_votes integer DEFAULT 1
)
RETURNS TABLE (
  place_id text,
  name text,
  formatted_address text,
  rating numeric,
  user_ratings_total integer,
  latitude double precision,
  longitude double precision,
  phone text,
  opening_hours jsonb,
  types text[],
  amenities text[],
  thumbnail_url text,
  details_fetched_at timestamptz,
  details_expires_at timestamptz,
  distance_meters double precision,
  category_tags jsonb
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    c.place_id,
    c.name,
    c.formatted_address,
    c.rating,
    c.user_ratings_total,
    c.latitude,
    c.longitude,
    c.phone,
    c.opening_hours,
    c.types,
    c.amenities,
    c.thumbnail_url,
    c.details_fetched_at,
    c.details_expires_at,
    ST_Distance(c.geom, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) AS distance_meters,
    COALESCE(
      (
        SELECT jsonb_agg(
                 jsonb_build_object('id', t.category_id, 'count', t.vote_count)
                 ORDER BY t.vote_count DESC, t.category_id
               )
        FROM public.cafe_category_tags t
        WHERE t.place_id = c.place_id
      ),
      '[]'::jsonb
    ) AS category_tags
  FROM public.cafes c
  WHERE c.geom IS NOT NULL
    AND ST_DWithin(c.geom, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_meters)
    AND (
      p_category_ids IS NULL
      OR cardinality(p_category_ids) = 0
      OR EXISTS (
        SELECT 1
        FROM public.cafe_category_tags t
        WHERE t.place_id = c.place_id
          AND t.category_id = ANY(p_category_ids)
          AND t.vote_count >= p_min_votes
      )
    )
  ORDER BY c.geom <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  LIMIT p_limit;
$$;
