-- "What did you order?" becomes multi-select (up to 5 items).
--
-- The answers move to a text[] column so each item stays separate. The old
-- ordered_item text column is kept, and the app keeps writing a ", "-joined
-- copy into it, so builds that still read or write ordered_item don't break
-- while the update rolls out. An in-place type change would have broken them.

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS ordered_items text[] NOT NULL DEFAULT '{}';

-- Backfill from the single-value column. The empty-array guard keeps this safe
-- to re-run and leaves rows the new app already wrote alone.
UPDATE public.reviews
  SET ordered_items = ARRAY[trim(ordered_item)]
  WHERE ordered_items = '{}'
    AND coalesce(trim(ordered_item), '') <> '';

COMMENT ON COLUMN public.reviews.ordered_items IS
  'What the reviewer ordered, one entry per item (max 5 in the app). ordered_item holds a joined copy for older clients.';
