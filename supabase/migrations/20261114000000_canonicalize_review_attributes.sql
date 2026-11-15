-- Canonicalise reviews.attributes to cafe_categories ids.
--
-- Some reviews still carry an attribute by its label, or a near-spelling of it
-- (e.g. "Study friendly", "study_friendly"), next to the real id ("study"). The
-- 20260919000200 backfill only matched exact labels that existed then, and
-- categories added since were never covered. Each spelling counts separately
-- in cafe_attribute_counts, so the cafe page showed two "Study Friendly" chips,
-- one of them without an icon.
--
-- Matching order, per value: exact id, case-insensitive label, then a slug
-- (lowercase letters and digits only) of the label or the id. Values that
-- match nothing are kept as they are, so no data is lost. Duplicates in one
-- review collapse to the first occurrence, keeping the author's order.
--
-- Idempotent: a second run finds every value already an id and updates nothing.
-- Rewriting reviews.attributes fires trg_reviews_attribute_counts, which
-- rebuilds cafe_attribute_counts for each affected cafe.

CREATE OR REPLACE FUNCTION pg_temp.attr_slug(v text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(lower(v), '[^a-z0-9]', '', 'g');
$$;

WITH resolved AS (
  SELECT
    r.id,
    (
      SELECT array_agg(canon ORDER BY first_ord)
      FROM (
        SELECT canon, min(ord) AS first_ord
        FROM (
          SELECT
            t.ord,
            COALESCE(
              (SELECT c.id FROM public.cafe_categories c
                WHERE c.id = t.a LIMIT 1),
              (SELECT c.id FROM public.cafe_categories c
                WHERE lower(c.label) = lower(t.a)
                ORDER BY c.display_order, c.id LIMIT 1),
              (SELECT c.id FROM public.cafe_categories c
                WHERE pg_temp.attr_slug(c.label) = pg_temp.attr_slug(t.a)
                   OR pg_temp.attr_slug(c.id) = pg_temp.attr_slug(t.a)
                ORDER BY c.display_order, c.id LIMIT 1),
              t.a
            ) AS canon
          FROM unnest(r.attributes) WITH ORDINALITY AS t(a, ord)
        ) mapped
        GROUP BY canon
      ) deduped
    ) AS attrs
  FROM public.reviews r
  WHERE r.attributes IS NOT NULL
    AND array_length(r.attributes, 1) > 0
)
UPDATE public.reviews r
SET attributes = resolved.attrs
FROM resolved
WHERE r.id = resolved.id
  AND r.attributes IS DISTINCT FROM resolved.attrs;

DO $$
DECLARE
  unmatched text[];
BEGIN
  SELECT array_agg(DISTINCT a) INTO unmatched
  FROM public.reviews r, unnest(r.attributes) AS a
  WHERE a NOT IN (SELECT id FROM public.cafe_categories);

  IF unmatched IS NOT NULL THEN
    RAISE NOTICE 'attribute canonicalisation: % value(s) matched no category: %',
      array_length(unmatched, 1), unmatched;
  END IF;
END $$;
