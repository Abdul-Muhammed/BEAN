-- Map + search performance.
--
-- Discover used to ask an Edge Function for "cafes within R metres of the map
-- centre". That function authenticated the caller with a network round trip,
-- missed its cache on almost every pan (the key was lat/lng to 3 decimals), and
-- fell through to Google whenever the database knew fewer than 8 cafes. It
-- returned the 20-40 cafes nearest the centre, so a zoomed-out map showed a
-- small cluster in the middle and nothing at the edges.
--
-- This migration gives the client two read-only RPCs it calls directly:
--
--   cafes_in_bbox  every cafe inside the visible bounding box (lean pins for
--                  the map) plus one page of full cards for the list, in one
--                  round trip. Category filters are applied here with AND
--                  semantics, so the map and the list agree.
--   search_cafes   trigram name search ranked by match quality, then distance.
--
-- Google is no longer on the request path for either. The Edge Functions stay
-- as background backfill, rate limited per map tile by places_backfill_log.

-- =====================================================
-- 1. cafe_attribute_counts: live view -> maintained table
-- =====================================================

-- The view aggregated every row of public.reviews on each read, and the
-- unnest() stopped the GIN index on reviews.attributes from helping. Discover
-- now reads it on every map move, so it becomes a table kept current by a
-- trigger. The name and columns are unchanged, so existing readers
-- (getAttributesForCafes, cafes_by_attributes) keep working as they are.
--
-- Guarded on relkind: DROP VIEW IF EXISTS errors when the name is already the
-- table, which would make this migration fail on a second run.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'cafe_attribute_counts' AND c.relkind = 'v'
  ) THEN
    DROP VIEW public.cafe_attribute_counts;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.cafe_attribute_counts (
  cafe_id text NOT NULL,
  attribute text NOT NULL,
  votes integer NOT NULL,
  PRIMARY KEY (cafe_id, attribute)
);

CREATE INDEX IF NOT EXISTS idx_cafe_attribute_counts_attribute
  ON public.cafe_attribute_counts (attribute, votes DESC);

ALTER TABLE public.cafe_attribute_counts ENABLE ROW LEVEL SECURITY;

-- Same visibility as the reviews it is derived from: signed-in users only.
-- There are no write policies; only the trigger function below writes.
DROP POLICY IF EXISTS "Signed-in users can read cafe attribute counts"
  ON public.cafe_attribute_counts;
CREATE POLICY "Signed-in users can read cafe attribute counts"
  ON public.cafe_attribute_counts FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.cafe_attribute_counts TO authenticated;

COMMENT ON TABLE public.cafe_attribute_counts IS
  'How many distinct people tagged each attribute on each cafe. Maintained from reviews.attributes by trg_reviews_attribute_counts.';

-- Recompute one cafe from scratch rather than applying deltas: votes counts
-- distinct people, so one person reviewing the same cafe twice must still
-- count once, and a delta cannot know that without reading the other reviews.
-- One cafe's reviews is a small, indexed read (idx_reviews_cafe_id).
CREATE OR REPLACE FUNCTION public.refresh_cafe_attribute_counts(p_cafe_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  DELETE FROM public.cafe_attribute_counts WHERE cafe_id = p_cafe_id;
  INSERT INTO public.cafe_attribute_counts (cafe_id, attribute, votes)
  SELECT r.cafe_id, a.attribute, count(DISTINCT r.user_id)::integer
  FROM public.reviews r,
       LATERAL unnest(r.attributes) AS a(attribute)
  WHERE r.cafe_id = p_cafe_id
  GROUP BY r.cafe_id, a.attribute;
$$;

REVOKE ALL ON FUNCTION public.refresh_cafe_attribute_counts(text) FROM PUBLIC;

-- SECURITY DEFINER because reviewers have no write access to the counts table.
-- search_path is pinned so the definer's rights cannot be redirected.
CREATE OR REPLACE FUNCTION public.reviews_attribute_counts_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.cafe_id IS NOT NULL THEN
    PERFORM public.refresh_cafe_attribute_counts(OLD.cafe_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.cafe_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.cafe_id IS DISTINCT FROM OLD.cafe_id) THEN
    PERFORM public.refresh_cafe_attribute_counts(NEW.cafe_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_attribute_counts ON public.reviews;
CREATE TRIGGER trg_reviews_attribute_counts
  AFTER INSERT OR DELETE OR UPDATE OF cafe_id, attributes, user_id ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.reviews_attribute_counts_trigger();

-- One-off backfill from the existing reviews.
TRUNCATE public.cafe_attribute_counts;
INSERT INTO public.cafe_attribute_counts (cafe_id, attribute, votes)
SELECT r.cafe_id, a.attribute, count(DISTINCT r.user_id)::integer
FROM public.reviews r,
     LATERAL unnest(r.attributes) AS a(attribute)
WHERE r.cafe_id IS NOT NULL
GROUP BY r.cafe_id, a.attribute;

-- =====================================================
-- 2. Google backfill rate limit
-- =====================================================

-- One row per map tile that has been filled from Google Nearby Search. The
-- nearby-cafes function refuses to call Google for a tile filled in the last
-- 30 days, for any user, so panning around an area costs Google once a month
-- at most. Service role only: RLS on with no policies.
CREATE TABLE IF NOT EXISTS public.places_backfill_log (
  tile_key text PRIMARY KEY,
  last_run timestamptz NOT NULL DEFAULT now(),
  result_count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.places_backfill_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.places_backfill_log IS
  'Map tiles already filled from Google Nearby Search, so nearby-cafes calls Google at most once per tile per 30 days.';

-- =====================================================
-- 3. cafes_in_bbox
-- =====================================================

-- One call per map move. Returns
--   pins         every matching cafe in the box (capped), lean, ranked so the
--                first p_full_pins get pin_tier 'full' and the rest 'mini'
--   list         one page of full cards, nearest the box centre first. Cafes
--                the client already holds (p_known_ids) come back as
--                {place_id, known: true} only, so their details aren't resent.
--   total        how many cafes matched
--   next_cursor  offset of the next list page, or null
--
-- p_include_pins = false fetches a further list page without the pins.
CREATE OR REPLACE FUNCTION public.cafes_in_bbox(
  p_sw_lat double precision,
  p_sw_lng double precision,
  p_ne_lat double precision,
  p_ne_lng double precision,
  p_attributes text[] DEFAULT '{}',
  p_cursor integer DEFAULT 0,
  p_list_limit integer DEFAULT 20,
  p_known_ids text[] DEFAULT '{}',
  p_include_pins boolean DEFAULT true,
  p_pin_limit integer DEFAULT 500,
  p_full_pins integer DEFAULT 25
)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  WITH params AS (
    SELECT
      ST_MakeEnvelope(p_sw_lng, p_sw_lat, p_ne_lng, p_ne_lat, 4326)::geography AS box,
      ST_SetSRID(
        ST_MakePoint((p_sw_lng + p_ne_lng) / 2, (p_sw_lat + p_ne_lat) / 2),
        4326
      )::geography AS centre
  ),
  -- Cafes carrying every requested attribute. Computed once, from the
  -- arguments only: referencing a CTE column here would make it a correlated
  -- subquery re-run for every cafe in the box (seconds instead of
  -- milliseconds once a box holds thousands of cafes).
  attr_match AS (
    SELECT cac.cafe_id
    FROM public.cafe_attribute_counts cac
    WHERE COALESCE(cardinality(p_attributes), 0) > 0
      AND cac.attribute = ANY (p_attributes)
      AND cac.votes >= 1
    GROUP BY cac.cafe_id
    HAVING count(DISTINCT cac.attribute) = cardinality(p_attributes)
  ),
  matched AS (
    SELECT c.place_id, c.name, c.formatted_address, c.rating,
           c.latitude, c.longitude, c.thumbnail_url, c.geom
    FROM public.cafes c, params
    WHERE c.geom && params.box
      AND (
        COALESCE(cardinality(p_attributes), 0) = 0
        OR c.place_id IN (SELECT cafe_id FROM attr_match)
      )
  ),
  review_counts AS (
    SELECT r.cafe_id, count(*)::integer AS n
    FROM public.reviews r
    WHERE r.cafe_id IN (SELECT place_id FROM matched)
    GROUP BY r.cafe_id
  ),
  ranked AS (
    SELECT m.*,
           COALESCE(rc.n, 0) AS review_count,
           row_number() OVER (
             ORDER BY m.rating DESC NULLS LAST, COALESCE(rc.n, 0) DESC, m.place_id
           ) AS rk
    FROM matched m
    LEFT JOIN review_counts rc ON rc.cafe_id = m.place_id
  ),
  pins AS (
    SELECT jsonb_build_object(
             'place_id', r.place_id,
             'name', r.name,
             'latitude', r.latitude,
             'longitude', r.longitude,
             'rating', r.rating,
             'pin_tier', CASE WHEN r.rk <= p_full_pins THEN 'full' ELSE 'mini' END
           ) AS pin
    FROM ranked r
    WHERE p_include_pins
    ORDER BY r.rk
    LIMIT p_pin_limit
  ),
  page AS (
    SELECT m.*, ST_Distance(m.geom, params.centre) AS distance_meters
    FROM matched m, params
    ORDER BY m.geom <-> params.centre, m.place_id
    OFFSET GREATEST(p_cursor, 0)
    LIMIT GREATEST(p_list_limit, 0)
  ),
  cards AS (
    SELECT
      p.distance_meters,
      p.place_id,
      CASE
        WHEN p.place_id = ANY (COALESCE(p_known_ids, '{}'))
        THEN jsonb_build_object('place_id', p.place_id, 'known', true)
        ELSE jsonb_build_object(
          'place_id', p.place_id,
          'name', COALESCE(p.name, rv.cafe_name),
          'formatted_address', p.formatted_address,
          'rating', p.rating,
          'latitude', p.latitude,
          'longitude', p.longitude,
          -- Stored thumbnail, else any cached photo, else the latest review's
          -- image. Never a Google call.
          'thumbnail_url', COALESCE(p.thumbnail_url, ph.public_url, rv.cafe_image),
          'distance_meters', p.distance_meters,
          'attributes', COALESCE(at.attributes, '[]'::jsonb)
        )
      END AS card
    FROM page p
    LEFT JOIN LATERAL (
      SELECT cp.public_url
      FROM public.cafe_photos cp
      WHERE cp.place_id = p.place_id
      ORDER BY cp.position
      LIMIT 1
    ) ph ON p.thumbnail_url IS NULL
    LEFT JOIN LATERAL (
      SELECT r2.cafe_name, r2.cafe_image
      FROM public.reviews r2
      WHERE r2.cafe_id = p.place_id
      ORDER BY r2.created_at DESC
      LIMIT 1
    ) rv ON p.thumbnail_url IS NULL OR p.name IS NULL
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
               jsonb_build_object('attribute', x.attribute, 'votes', x.votes)
               ORDER BY x.votes DESC, x.attribute
             ) AS attributes
      FROM (
        SELECT cac.attribute, cac.votes
        FROM public.cafe_attribute_counts cac
        WHERE cac.cafe_id = p.place_id
        ORDER BY cac.votes DESC, cac.attribute
        LIMIT 5
      ) x
    ) at ON true
  ),
  totals AS (
    SELECT count(*)::integer AS total FROM matched
  )
  SELECT jsonb_build_object(
    'pins', COALESCE((SELECT jsonb_agg(pin) FROM pins), '[]'::jsonb),
    'list', COALESCE(
      (SELECT jsonb_agg(card ORDER BY distance_meters, place_id) FROM cards),
      '[]'::jsonb
    ),
    'total', totals.total,
    'next_cursor', CASE
      WHEN GREATEST(p_cursor, 0) + GREATEST(p_list_limit, 0) < totals.total
      THEN GREATEST(p_cursor, 0) + GREATEST(p_list_limit, 0)
    END
  )
  FROM totals;
$$;

REVOKE ALL ON FUNCTION public.cafes_in_bbox(
  double precision, double precision, double precision, double precision,
  text[], integer, integer, text[], boolean, integer, integer
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cafes_in_bbox(
  double precision, double precision, double precision, double precision,
  text[], integer, integer, text[], boolean, integer, integer
) TO authenticated;

COMMENT ON FUNCTION public.cafes_in_bbox(
  double precision, double precision, double precision, double precision,
  text[], integer, integer, text[], boolean, integer, integer
) IS
  'Map pins and one list page for the visible bounding box, with AND category filtering. Reads only Supabase tables.';

-- =====================================================
-- 4. search_cafes
-- =====================================================

-- Ranked text search over known cafes. Name prefix matches first, then trigram
-- word similarity, then distance from the caller when known. Uses the trigram
-- GIN indexes from 20260601000000 (`<%` and ILIKE are both index-assisted).
CREATE OR REPLACE FUNCTION public.search_cafes(
  p_q text,
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  place_id text,
  name text,
  formatted_address text,
  rating numeric,
  latitude double precision,
  longitude double precision,
  thumbnail_url text,
  distance_meters double precision
)
LANGUAGE sql
STABLE
AS $$
  WITH q AS (
    SELECT
      btrim(p_q) AS term,
      -- Escape LIKE wildcards so a typed % or _ matches literally.
      replace(replace(replace(btrim(p_q), '\', '\\'), '%', '\%'), '_', '\_') AS pattern,
      CASE
        WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL
        THEN ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      END AS origin
  )
  SELECT
    c.place_id,
    c.name,
    c.formatted_address,
    c.rating,
    c.latitude,
    c.longitude,
    COALESCE(c.thumbnail_url, ph.public_url) AS thumbnail_url,
    CASE WHEN q.origin IS NOT NULL AND c.geom IS NOT NULL
         THEN ST_Distance(c.geom, q.origin) END AS distance_meters
  FROM public.cafes c
  CROSS JOIN q
  LEFT JOIN LATERAL (
    SELECT cp.public_url
    FROM public.cafe_photos cp
    WHERE cp.place_id = c.place_id
    ORDER BY cp.position
    LIMIT 1
  ) ph ON c.thumbnail_url IS NULL
  WHERE char_length(q.term) >= 2
    AND (
      q.term <% c.name
      OR c.name ILIKE '%' || q.pattern || '%'
      OR c.formatted_address ILIKE '%' || q.pattern || '%'
    )
  ORDER BY
    (c.name ILIKE q.pattern || '%') DESC,
    word_similarity(q.term, c.name) DESC,
    distance_meters NULLS LAST,
    c.rating DESC NULLS LAST
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;

REVOKE ALL ON FUNCTION public.search_cafes(text, double precision, double precision, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_cafes(text, double precision, double precision, integer) TO authenticated;

COMMENT ON FUNCTION public.search_cafes(text, double precision, double precision, integer) IS
  'Ranked trigram search over public.cafes. Reads only Supabase tables; Google backfill is the caller''s separate, explicit step.';
