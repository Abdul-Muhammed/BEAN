/*
  # Create follows table (social graph)

  Directed follow relationships between auth users. A row (A, B) means
  "A follows B". Mutual follows are two rows. Counts and lists are derived
  from this table with live queries (no denormalized counters), which is fine
  for the current pre-launch dataset.

  RLS:
    - Any signed-in user can read follows (needed for counts, followers/following
      lists, and mutual-follow detection).
    - A user may only create/remove rows where they are the follower
      (follower_id = auth.uid()).
*/

CREATE TABLE IF NOT EXISTS public.follows (
  follower_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT follows_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower  ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed-in users can read follows" ON public.follows;
DROP POLICY IF EXISTS "Users can insert own follows" ON public.follows;
DROP POLICY IF EXISTS "Users can delete own follows" ON public.follows;

CREATE POLICY "Signed-in users can read follows"
  ON public.follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own follows"
  ON public.follows FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid());
CREATE POLICY "Users can delete own follows"
  ON public.follows FOR DELETE TO authenticated USING (follower_id = auth.uid());
