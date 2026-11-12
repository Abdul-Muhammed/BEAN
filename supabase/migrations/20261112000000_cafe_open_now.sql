-- Open Now / Top Rated filters.
--
-- List cafes never carried opening hours, so the Open Now filter (which kept
-- only cafes known to be open) emptied every list. Hours now live in
-- cafes.opening_hours for every cafe (backfilled once, then fetched when a cafe
-- is first saved), and "is it open right now" is worked out here, in
-- Pacific/Auckland time, so every screen agrees and the phone's clock and
-- timezone don't matter.
--
--   hours_fetched_at   when we last asked Google for this cafe's hours. Tells
--                      "never asked" apart from "Google has no hours", so a
--                      cafe without listed hours is never re-billed.
--   cafe_open_now      open/closed/unknown (null) from Google legacy periods.
--   cafe_open_status   live open_now for a set of ids (Home, whose nearby list
--                      comes from a 7-day cache and so can't carry it).
--   cafes_in_bbox      gains p_open_now / p_min_rating, so Discover's pins,
--                      list pages and total are filtered on the server.

-- =====================================================
-- 1. hours_fetched_at
-- =====================================================
ALTER TABLE public.cafes ADD COLUMN IF NOT EXISTS hours_fetched_at timestamptz;

-- Every successful Details fetch already requested opening_hours.
UPDATE public.cafes
SET hours_fetched_at = details_fetched_at
WHERE hours_fetched_at IS NULL AND details_fetched_at IS NOT NULL;

-- The backfill and the edge functions look for cafes still missing hours.
CREATE INDEX IF NOT EXISTS idx_cafes_hours_missing
  ON public.cafes (place_id) WHERE hours_fetched_at IS NULL;

-- =====================================================
-- 2. cafe_open_now
-- =====================================================

-- Google legacy opening_hours.periods: [{open:{day,time:'HHMM'}, close:{...}}],
-- day 0 = Sunday. Each period becomes a span in minutes-of-week. A close at or
-- before its open runs past Saturday night into the next week, and a lone
-- period with no close means open 24/7. "Now" is tested both as-is and one week
-- later so spans that wrap Saturday -> Sunday still match.
--
-- Returns null when there are no usable periods (hours unknown).
-- STABLE, not IMMUTABLE: the result depends on the timezone database.
CREATE OR REPLACE FUNCTION public.cafe_open_now(
  p_hours jsonb,
  p_at timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  WITH now_m AS (
    SELECT (extract(dow FROM t)::int * 1440
            + extract(hour FROM t)::int * 60
            + extract(minute FROM t)::int) AS m
    FROM (SELECT p_at AT TIME ZONE 'Pacific/Auckland' AS t) local
  ),
  periods AS (
    SELECT p
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(p_hours -> 'periods') = 'array'
           THEN p_hours -> 'periods' ELSE '[]'::jsonb END
    ) AS p
    WHERE jsonb_typeof(p -> 'open') = 'object'
      AND (p -> 'open' ->> 'day') ~ '^[0-6]$'
      AND (p -> 'open' ->> 'time') ~ '^[0-9]{4}$'
  ),
  spans AS (
    SELECT
      o,
      CASE
        WHEN c IS NULL THEN NULL
        WHEN c <= o THEN c + 10080
        ELSE c
      END AS c
    FROM (
      SELECT
        (p -> 'open' ->> 'day')::int * 1440
          + substr(p -> 'open' ->> 'time', 1, 2)::int * 60
          + substr(p -> 'open' ->> 'time', 3, 2)::int AS o,
        CASE
          WHEN jsonb_typeof(p -> 'close') = 'object'
           AND (p -> 'close' ->> 'day') ~ '^[0-6]$'
           AND (p -> 'close' ->> 'time') ~ '^[0-9]{4}$'
          THEN (p -> 'close' ->> 'day')::int * 1440
               + substr(p -> 'close' ->> 'time', 1, 2)::int * 60
               + substr(p -> 'close' ->> 'time', 3, 2)::int
        END AS c
      FROM periods
    ) raw
  )
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM spans) THEN NULL
    ELSE EXISTS (
      SELECT 1
      FROM spans, now_m
      WHERE spans.c IS NULL
         OR (now_m.m >= spans.o AND now_m.m < spans.c)
         OR (now_m.m + 10080 >= spans.o AND now_m.m + 10080 < spans.c)
    )
  END;
$$;

GRANT EXECUTE ON FUNCTION public.cafe_open_now(jsonb, timestamptz) TO authenticated, anon;

COMMENT ON FUNCTION public.cafe_open_now(jsonb, timestamptz) IS
  'Open (true), closed (false) or unknown (null) at p_at in Pacific/Auckland, from Google legacy opening_hours.periods.';

-- =====================================================
-- 3. cafe_open_status
-- =====================================================

-- Live open/closed for the cafes on screen. Ids we don't know, or know no hours
-- for, come back with open_now null.
CREATE OR REPLACE FUNCTION public.cafe_open_status(p_place_ids text[])
RETURNS TABLE (place_id text, open_now boolean)
LANGUAGE sql
STABLE
AS $$
  SELECT c.place_id, public.cafe_open_now(c.opening_hours)
  FROM public.cafes c
  WHERE c.place_id = ANY (COALESCE(p_place_ids, '{}'));
$$;

REVOKE ALL ON FUNCTION public.cafe_open_status(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cafe_open_status(text[]) TO authenticated;

COMMENT ON FUNCTION public.cafe_open_status(text[]) IS
  'Live open_now (Pacific/Auckland) for the given cafes; null when hours are unknown.';

-- =====================================================
-- 4. cafes_in_bbox with Open Now / min rating
-- =====================================================

-- Same as 20261018000000_map_search.sql, plus:
--   p_open_now    drop cafes known to be closed right now. Cafes with unknown
--                 hours stay, by product decision.
--   p_min_rating  drop cafes rated below this, and unrated cafes.
--   open_now      on every pin and card. Known cards ({known: true}) carry it
--                 too, because it changes over time while the rest doesn't.
--
-- The old 11-argument version is dropped so PostgREST never sees two
-- overloads and calls stay unambiguous.
DROP FUNCTION IF EXISTS public.cafes_in_bbox(
  double precision, double precision, double precision, double precision,
  text[], integer, integer, text[], boolean, integer, integer
);

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
  p_full_pins integer DEFAULT 25,
  p_open_now boolean DEFAULT false,
  p_min_rating numeric DEFAULT NULL
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
  -- Computed once from the arguments only; see 20261018000000 for why.
  attr_match AS (
    SELECT cac.cafe_id
    FROM public.cafe_attribute_counts cac
    WHERE COALESCE(cardinality(p_attributes), 0) > 0
      AND cac.attribute = ANY (p_attributes)
      AND cac.votes >= 1
    GROUP BY cac.cafe_id
    HAVING count(DISTINCT cac.attribute) = cardinality(p_attributes)
  ),
  in_box AS (
    SELECT c.place_id, c.name, c.formatted_address, c.rating,
           c.latitude, c.longitude, c.thumbnail_url, c.geom,
           public.cafe_open_now(c.opening_hours) AS open_now
    FROM public.cafes c, params
    WHERE c.geom && params.box
      AND (
        COALESCE(cardinality(p_attributes), 0) = 0
        OR c.place_id IN (SELECT cafe_id FROM attr_match)
      )
      AND (p_min_rating IS NULL OR c.rating >= p_min_rating)
  ),
  matched AS (
    SELECT *
    FROM in_box
    WHERE NOT COALESCE(p_open_now, false) OR open_now IS DISTINCT FROM false
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
             'open_now', r.open_now,
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
        THEN jsonb_build_object('place_id', p.place_id, 'known', true, 'open_now', p.open_now)
        ELSE jsonb_build_object(
          'place_id', p.place_id,
          'name', COALESCE(p.name, rv.cafe_name),
          'formatted_address', p.formatted_address,
          'rating', p.rating,
          'latitude', p.latitude,
          'longitude', p.longitude,
          'thumbnail_url', COALESCE(p.thumbnail_url, ph.public_url, rv.cafe_image),
          'distance_meters', p.distance_meters,
          'open_now', p.open_now,
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
  text[], integer, integer, text[], boolean, integer, integer, boolean, numeric
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cafes_in_bbox(
  double precision, double precision, double precision, double precision,
  text[], integer, integer, text[], boolean, integer, integer, boolean, numeric
) TO authenticated;

COMMENT ON FUNCTION public.cafes_in_bbox(
  double precision, double precision, double precision, double precision,
  text[], integer, integer, text[], boolean, integer, integer, boolean, numeric
) IS
  'Map pins and one list page for the visible bounding box, with AND category, Open Now and min-rating filtering. Reads only Supabase tables.';
