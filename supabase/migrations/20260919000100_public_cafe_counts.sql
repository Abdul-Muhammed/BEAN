-- Favourite and saved counts for any profile.
--
-- public.favorites and public.bookmarks are owner-only under RLS, which is
-- correct: which cafes someone saved is private. But the profile design shows
-- Favourites and Saved totals when viewing another person, and a total is not
-- private in the same way a list is.
--
-- This function is SECURITY DEFINER so it can count rows the caller cannot
-- read, and it returns only two integers. There is no argument or code path
-- that can be made to return a cafe id, so the aggregate leaks nothing beyond
-- the two numbers the profile displays.
--
-- search_path is pinned so the definer's rights cannot be redirected at a
-- different schema by a caller-controlled search_path.

CREATE OR REPLACE FUNCTION public.public_cafe_counts(target uuid)
RETURNS TABLE (favourites integer, saved integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    (SELECT count(*)::integer FROM public.favorites f WHERE f.user_id = target),
    (SELECT count(*)::integer FROM public.bookmarks b WHERE b.user_id = target);
$$;

-- Only signed-in users may ask, matching the visibility of profiles themselves.
REVOKE ALL ON FUNCTION public.public_cafe_counts(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_cafe_counts(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.public_cafe_counts(uuid) TO authenticated;

COMMENT ON FUNCTION public.public_cafe_counts(uuid) IS
  'Aggregate-only favourite and saved counts for a user. SECURITY DEFINER so it can count rows protected by owner-only RLS; returns totals, never cafe ids.';
