-- Hand-picked "Top Cafes" for a profile.
--
-- Until now the profile derived its three top cafes from the user's highest
-- ratings. The Top Cafes editor lets people choose and order them instead, so
-- the choice needs somewhere to live.
--
-- Stored as an ordered array on the profile rather than as its own table: the
-- list is capped at three, position is just the array index, and it is read on
-- every profile load, so keeping it on the row avoids a join and needs no new
-- RLS policy. The existing profiles policies already scope reads and writes.
--
-- Cafe ids here are Google place_ids, matching reviews.cafe_id. They are not
-- foreign-keyed to public.cafes because a cafe row is only created once someone
-- opens that cafe's detail page, and a stale id simply renders as a missing
-- tile rather than an error.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS top_cafes text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.profiles.top_cafes IS
  'Hand-picked cafe ids (Google place_id) for the profile''s Top Cafes, in display order. Capped at 3 by the client. Empty means fall back to deriving them from the user''s highest-rated reviews.';
