-- Crowdsourced cafe attributes.
--
-- Until now a review's attributes went nowhere: they were stored against the
-- review and never aggregated onto the cafe, so filtering by a category could
-- not find the cafe and the Home feed could not build a section from it. What
-- the filters actually matched was determineAmenities() in the client, which
-- guessed three values from Google place types and asserted "Has WiFi" for
-- every cafe. This migration makes reviews the source of truth instead.
--
-- STATEMENT ORDER MATTERS. The backfill in section 1 maps review attributes
-- from labels to ids using the labels as they exist today, so it must run
-- before section 3 renames any label. Reordering these sections silently
-- corrupts historical review data.

-- =====================================================
-- 1. Backfill reviews.attributes: labels -> category ids
-- =====================================================

-- Report anything that will not map, before touching a row. These are left
-- exactly as they are rather than dropped, so nothing is lost silently.
DO $$
DECLARE
  unmatched text[];
BEGIN
  SELECT array_agg(DISTINCT a)
    INTO unmatched
  FROM public.reviews r,
       LATERAL unnest(r.attributes) AS a
  WHERE a NOT IN (SELECT label FROM public.cafe_categories)
    AND a NOT IN (SELECT id FROM public.cafe_categories);

  IF unmatched IS NOT NULL THEN
    RAISE NOTICE
      'cafe attribute backfill: % value(s) matched no category and were left unchanged: %',
      array_length(unmatched, 1), unmatched;
  ELSE
    RAISE NOTICE 'cafe attribute backfill: every attribute mapped to a category id';
  END IF;
END $$;

-- Idempotent: on a second run the values are already ids, no label matches, and
-- COALESCE keeps them as they are. Ordinality preserves the author's ordering.
UPDATE public.reviews r
SET attributes = (
  SELECT array_agg(COALESCE(c.id, t.a) ORDER BY t.ord)
  FROM unnest(r.attributes) WITH ORDINALITY AS t(a, ord)
  LEFT JOIN public.cafe_categories c ON c.label = t.a
)
WHERE r.attributes IS NOT NULL
  AND array_length(r.attributes, 1) > 0;

-- =====================================================
-- 2. New categories
-- =====================================================

-- The Halal glyph is the exact asset exported from the Figma profile frame
-- (node 586:17901). Note it is a colour Streamline icon while the 16 seeded
-- earlier are monochrome stroke icons, so the chip row is visually mixed until
-- the rest of the set is replaced from the same source.
--
-- Pet Friendly appears in no frame. Its glyph follows the monochrome 24x24
-- stroke pattern the existing categories use and is meant to be swapped for a
-- real export later.
INSERT INTO public.cafe_categories (id, label, icon_svg_xml, display_order, is_active)
VALUES
  ('halal', 'Halal', $svg$<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip_halal)"><path d="M7.9996 11.9725C9.318 12.115 10.6449 11.7955 11.7539 11.0685C12.8628 10.3414 13.6849 9.25187 14.0799 7.986C13.1875 7.99927 12.3045 7.8014 11.5031 7.40847C10.7017 7.0156 10.0045 6.43884 9.4684 5.72524C8.93233 5.01165 8.57253 4.18144 8.41833 3.30233C8.26413 2.42321 8.32 1.52011 8.5812 0.666667C7.14433 0.689467 5.76978 1.25728 4.73572 2.25519C3.70166 3.25309 3.08532 4.60657 3.01141 6.04172C2.93751 7.47687 3.41156 8.88647 4.33766 9.98533C5.26374 11.0841 6.5727 11.7902 7.9996 11.9605" fill="#FFF9BF"/><path d="M10.1231 9.16326V9.15192C8.74693 8.98192 7.4802 8.31572 6.56032 7.27826C5.64044 6.24074 5.13071 4.90327 5.12673 3.51671C5.12802 2.89094 5.23361 2.26976 5.43917 1.67871C4.49566 2.3349 3.77388 3.26238 3.36956 4.33816C2.96523 5.41394 2.89745 6.58722 3.1752 7.70239C3.45295 8.81759 4.06311 9.82199 4.92477 10.5825C5.78645 11.3429 6.85893 11.8236 8 11.9606V11.9719C9.2864 12.1107 10.5817 11.8093 11.6748 11.117C12.7679 10.4246 13.594 9.38232 14.0183 8.15999C12.8841 8.95479 11.5001 9.31126 10.1231 9.16326Z" fill="#FFEF5E"/><path d="M5.33529 10.6699L8 8.00521L10.6647 10.6699" stroke="#191919" stroke-width="0.666667" stroke-linecap="round" stroke-linejoin="round"/><path d="M0.671875 15.3333H15.3279" stroke="#191919" stroke-width="0.666667" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.0206 10.8979C12.9997 10.1775 13.7216 9.16198 14.0805 8.00071C13.1877 8.01411 12.3046 7.81618 11.503 7.42318C10.7015 7.03018 10.0041 6.4532 9.46793 5.73936C8.93187 5.0255 8.57207 4.19501 8.41807 3.31563C8.26407 2.43626 8.3202 1.53293 8.5818 0.679362C7.54453 0.693555 6.53121 0.992682 5.65256 1.54404C4.77391 2.09541 4.06379 2.87776 3.59986 3.80555C3.13593 4.73334 2.93605 5.77084 3.0221 6.80458C3.10814 7.83831 3.47678 8.82851 4.08771 9.66684" stroke="#191919" stroke-width="0.666667" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 8.00521V14.0009" stroke="#191919" stroke-width="0.666667" stroke-linecap="round" stroke-linejoin="round"/></g><defs><clipPath id="clip_halal"><rect width="16" height="16" fill="white"/></clipPath></defs></svg>$svg$, 17, true),
  ('pet', 'Pet Friendly', $svg$<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="6.5" cy="11.5" rx="2" ry="2.5" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="10" cy="7" rx="2" ry="2.5" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="14" cy="7" rx="2" ry="2.5" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="17.5" cy="11.5" rx="2" ry="2.5" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 13.5c2.8 0 5 2 5 4.5 0 1.4-1.1 2.5-2.5 2.5-.8 0-1.6-.3-2.5-.3s-1.7.3-2.5.3C8.1 20.5 7 19.4 7 18c0-2.5 2.2-4.5 5-4.5Z" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$, 18, true)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  icon_svg_xml = EXCLUDED.icon_svg_xml,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- =====================================================
-- 3. Label corrections (safe now that reviews store ids)
-- =====================================================

UPDATE public.cafe_categories SET label = 'Speciality Coffee', updated_at = now()
  WHERE id = 'specialty' AND label <> 'Speciality Coffee';
UPDATE public.cafe_categories SET label = 'Free Parking', updated_at = now()
  WHERE id = 'parking' AND label <> 'Free Parking';

-- =====================================================
-- 4. Aggregate
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_reviews_attributes
  ON public.reviews USING gin (attributes);

-- A view rather than a maintained table: editing or deleting a review is
-- reflected immediately, with no triggers to keep in step and nothing to
-- backfill. votes counts distinct people, so one person reviewing the same
-- cafe three times still counts once.
DROP VIEW IF EXISTS public.cafe_attribute_counts;
CREATE VIEW public.cafe_attribute_counts
WITH (security_invoker = true) AS
  SELECT
    r.cafe_id,
    a.attribute,
    count(DISTINCT r.user_id)::integer AS votes
  FROM public.reviews r,
       LATERAL unnest(r.attributes) AS a(attribute)
  GROUP BY r.cafe_id, a.attribute;

GRANT SELECT ON public.cafe_attribute_counts TO authenticated;

COMMENT ON VIEW public.cafe_attribute_counts IS
  'How many distinct people tagged each attribute on each cafe, derived live from reviews.attributes (category ids).';

-- =====================================================
-- 5. Lookup used by the Home sections and Discover filter
-- =====================================================

-- One round trip for every section on Home. Deliberately has no ST_DWithin
-- radius: results are ordered nearest-first, so a cafe across town surfaces
-- only when nothing closer carries the attribute. Cafes with no coordinates,
-- and callers with no location, sort last rather than disappearing.
--
-- The join to cafes is a LEFT JOIN with a fallback to the most recent review,
-- so a cafe that was reviewed but never cached in public.cafes still renders a
-- card with its name and image.
CREATE OR REPLACE FUNCTION public.cafes_by_attributes(
  p_attributes text[],
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL,
  p_min_votes integer DEFAULT 1,
  p_limit_per integer DEFAULT 3
)
RETURNS TABLE (
  attribute text,
  place_id text,
  name text,
  formatted_address text,
  rating numeric,
  latitude double precision,
  longitude double precision,
  thumbnail_url text,
  votes integer,
  distance_meters double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    attr.attribute,
    m.place_id,
    m.name,
    m.formatted_address,
    m.rating,
    m.latitude,
    m.longitude,
    m.thumbnail_url,
    m.votes,
    m.distance_meters
  FROM unnest(p_attributes) AS attr(attribute)
  CROSS JOIN LATERAL (
    SELECT
      cac.cafe_id AS place_id,
      COALESCE(c.name, rv.cafe_name) AS name,
      c.formatted_address,
      c.rating,
      c.latitude,
      c.longitude,
      COALESCE(c.thumbnail_url, rv.cafe_image) AS thumbnail_url,
      cac.votes,
      CASE
        WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND c.geom IS NOT NULL
        THEN ST_Distance(
               c.geom,
               ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
             )
      END AS distance_meters
    FROM public.cafe_attribute_counts cac
    LEFT JOIN public.cafes c ON c.place_id = cac.cafe_id
    LEFT JOIN LATERAL (
      SELECT r2.cafe_name, r2.cafe_image
      FROM public.reviews r2
      WHERE r2.cafe_id = cac.cafe_id
      ORDER BY r2.created_at DESC
      LIMIT 1
    ) rv ON true
    WHERE cac.attribute = attr.attribute
      AND cac.votes >= p_min_votes
    ORDER BY distance_meters NULLS LAST, cac.votes DESC, c.rating DESC NULLS LAST
    LIMIT p_limit_per
  ) m;
$$;

REVOKE ALL ON FUNCTION public.cafes_by_attributes(text[], double precision, double precision, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cafes_by_attributes(text[], double precision, double precision, integer, integer) TO authenticated;

COMMENT ON FUNCTION public.cafes_by_attributes(text[], double precision, double precision, integer, integer) IS
  'Cafes carrying each given attribute id, nearest first with no distance cap, up to p_limit_per per attribute.';
