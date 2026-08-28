/*
  # Community cafe tags

  Google Places has no field carrying our 16+ category taxonomy, so the filter
  chips have never filtered anything real: `cafes.amenities` was declared but
  never written, and the client fabricated a 3-value array from Google `types`.

  The data already exists — every review captures 1-5 canonical categories in
  `reviews.attributes` — it was just never aggregated onto the cafe. This
  migration closes that loop:

    1. normalizes `reviews.attributes` from category labels to category ids
    2. adds `cafe_category_tags`, the per-cafe aggregate the filters query
    3. keeps it in sync with a trigger on `reviews`
    4. backfills from every review already stored

  The trigger RECOMPUTES rather than increments, which makes it idempotent,
  self-healing after any direct DB edit, and means deleting a review decrements
  its tags with no extra code.
*/

-- =====================================================
-- 1. reviews.attributes: labels -> ids
-- =====================================================
-- ReviewForm stored `category.label` ("Has WiFi") while profiles.preferences
-- stored `category.id` ("wifi"). Ids are the stable key — labels can be
-- reworded, which would silently orphan every historical review's tags.
--
-- COALESCE keeps anything that doesn't resolve (legacy values such as
-- 'Top Rated' and 'WiFi' from the mock data era) rather than nulling the whole
-- array. Those simply never match a category id and are ignored downstream.
UPDATE public.reviews r
SET attributes = ARRAY(
  SELECT COALESCE(c.id, a)
  FROM unnest(r.attributes) AS a
  LEFT JOIN public.cafe_categories c ON c.label = a
)
WHERE r.attributes IS NOT NULL
  AND array_length(r.attributes, 1) > 0;

-- =====================================================
-- 2. cafe_category_tags
-- =====================================================
-- No FK on place_id. reviews.cafe_id has no FK to cafes either — the whole
-- user-data layer references cafes by bare Google place_id with denormalized
-- name/image, and a review can exist for a cafe that was never persisted.
-- Filter queries inner-join `cafes` anyway, so an orphan row here is inert, and
-- it starts working the moment a nearby/search call upserts that cafe.
CREATE TABLE IF NOT EXISTS public.cafe_category_tags (
  place_id    text NOT NULL,
  category_id text NOT NULL REFERENCES public.cafe_categories(id) ON DELETE CASCADE,
  vote_count  integer NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (place_id, category_id)
);

-- The PK covers "which tags does this cafe have". This covers the other
-- direction: "which cafes carry this tag", which is what filtering asks.
CREATE INDEX IF NOT EXISTS idx_cafe_category_tags_category
  ON public.cafe_category_tags(category_id, place_id);

ALTER TABLE public.cafe_category_tags ENABLE ROW LEVEL SECURITY;

-- Matches the reference/cafe-data pattern (cafes, cafe_categories, cafe_photos):
-- open read, no write policy at all. Writes only ever happen inside the
-- SECURITY DEFINER trigger below, never from a client.
DROP POLICY IF EXISTS "Anyone can read cafe category tags" ON public.cafe_category_tags;
CREATE POLICY "Anyone can read cafe category tags"
  ON public.cafe_category_tags FOR SELECT USING (true);

-- =====================================================
-- 3. Recompute + trigger
-- =====================================================
-- vote_count is DISTINCT users, not rows: one person reviewing the same cafe
-- three times is still one voice saying it's halal.
CREATE OR REPLACE FUNCTION public.recompute_cafe_category_tags(p_place_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_place_id IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.cafe_category_tags WHERE place_id = p_place_id;

  INSERT INTO public.cafe_category_tags (place_id, category_id, vote_count, updated_at)
  SELECT r.cafe_id, a, count(DISTINCT r.user_id), now()
  FROM public.reviews r
  CROSS JOIN LATERAL unnest(r.attributes) AS a
  JOIN public.cafe_categories c ON c.id = a
  WHERE r.cafe_id = p_place_id
  GROUP BY r.cafe_id, a;
END;
$$;

CREATE OR REPLACE FUNCTION public.reviews_sync_category_tags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_cafe_category_tags(OLD.cafe_id);
    RETURN OLD;
  END IF;

  -- An edit that touched neither the tags nor the cafe can't change the
  -- aggregate, so don't pay for a recompute.
  IF TG_OP = 'UPDATE'
     AND OLD.attributes IS NOT DISTINCT FROM NEW.attributes
     AND OLD.cafe_id IS NOT DISTINCT FROM NEW.cafe_id THEN
    RETURN NEW;
  END IF;

  PERFORM public.recompute_cafe_category_tags(NEW.cafe_id);

  -- Re-pointing a review at a different cafe has to drain the old one too.
  IF TG_OP = 'UPDATE' AND OLD.cafe_id IS DISTINCT FROM NEW.cafe_id THEN
    PERFORM public.recompute_cafe_category_tags(OLD.cafe_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_sync_category_tags ON public.reviews;
CREATE TRIGGER trg_reviews_sync_category_tags
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.reviews_sync_category_tags();

-- =====================================================
-- 4. Backfill from existing reviews
-- =====================================================
INSERT INTO public.cafe_category_tags (place_id, category_id, vote_count, updated_at)
SELECT r.cafe_id, a, count(DISTINCT r.user_id), now()
FROM public.reviews r
CROSS JOIN LATERAL unnest(r.attributes) AS a
JOIN public.cafe_categories c ON c.id = a
GROUP BY r.cafe_id, a
ON CONFLICT (place_id, category_id) DO UPDATE SET
  vote_count = EXCLUDED.vote_count,
  updated_at = now();
