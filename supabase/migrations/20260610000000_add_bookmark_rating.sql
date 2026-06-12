/*
  # Add cafe_rating to bookmarks

  Persists the cafe's rating alongside each bookmark so saved cafes can show
  their real star rating on cold start (before live data has loaded), instead
  of falling back to 0. Numeric (not integer) because Google ratings are
  decimals like 4.3.
*/

ALTER TABLE public.bookmarks
  ADD COLUMN IF NOT EXISTS cafe_rating numeric;
