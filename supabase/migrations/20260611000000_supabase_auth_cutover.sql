/*
  # Supabase Auth cutover

  Removes the Clerk-based identity model and re-keys all user-owned tables to
  Supabase Auth (auth.users). Pre-launch with disposable data, so user rows are
  truncated rather than migrated.

  Changes:
    - profiles.id becomes auth.users.id (drops clerk_user_id, drops gen_random_uuid default)
    - reviews/bookmarks/favorites: clerk_user_id (text) -> user_id (uuid) referencing auth.users
    - Permissive USING(true) policies replaced with auth.uid()-scoped policies
      (reviews + profiles are public-read to signed-in users; bookmarks/favorites private)
    - handle_new_user() trigger auto-creates a profile row on auth.users insert
*/

-- =====================================================
-- profiles -> keyed by auth.users.id
-- =====================================================
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;

TRUNCATE TABLE public.profiles CASCADE;

-- Drop the Clerk id column (CASCADE removes idx_profiles_clerk_user_id_unique).
ALTER TABLE public.profiles DROP COLUMN IF EXISTS clerk_user_id CASCADE;

-- Re-point the primary key at auth.users.
ALTER TABLE public.profiles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id)
  REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "Signed-in users can read profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE TO authenticated USING (id = auth.uid());

-- =====================================================
-- reviews -> user_id (public-read, owner-write)
-- =====================================================
DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can update reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can delete reviews" ON public.reviews;

TRUNCATE TABLE public.reviews CASCADE;

ALTER TABLE public.reviews DROP COLUMN IF EXISTS clerk_user_id CASCADE;
ALTER TABLE public.reviews
  ADD COLUMN user_id uuid NOT NULL
  REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);

CREATE POLICY "Signed-in users can read reviews"
  ON public.reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own reviews"
  ON public.reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own reviews"
  ON public.reviews FOR DELETE TO authenticated USING (user_id = auth.uid());

-- =====================================================
-- bookmarks -> user_id (fully private)
-- =====================================================
DROP POLICY IF EXISTS "Anyone can read bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Anyone can insert bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Anyone can update bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Anyone can delete bookmarks" ON public.bookmarks;

TRUNCATE TABLE public.bookmarks CASCADE;

-- CASCADE also drops bookmarks_user_cafe_unique and idx_bookmarks_clerk_user_id.
ALTER TABLE public.bookmarks DROP COLUMN IF EXISTS clerk_user_id CASCADE;
ALTER TABLE public.bookmarks
  ADD COLUMN user_id uuid NOT NULL
  REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

ALTER TABLE public.bookmarks
  ADD CONSTRAINT bookmarks_user_cafe_unique UNIQUE (user_id, cafe_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);

CREATE POLICY "Users can read own bookmarks"
  ON public.bookmarks FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own bookmarks"
  ON public.bookmarks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own bookmarks"
  ON public.bookmarks FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own bookmarks"
  ON public.bookmarks FOR DELETE TO authenticated USING (user_id = auth.uid());

-- =====================================================
-- favorites -> user_id (fully private)
-- =====================================================
DROP POLICY IF EXISTS "Anyone can read favorites" ON public.favorites;
DROP POLICY IF EXISTS "Anyone can insert favorites" ON public.favorites;
DROP POLICY IF EXISTS "Anyone can update favorites" ON public.favorites;
DROP POLICY IF EXISTS "Anyone can delete favorites" ON public.favorites;

TRUNCATE TABLE public.favorites CASCADE;

ALTER TABLE public.favorites DROP COLUMN IF EXISTS clerk_user_id CASCADE;
ALTER TABLE public.favorites
  ADD COLUMN user_id uuid NOT NULL
  REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

ALTER TABLE public.favorites
  ADD CONSTRAINT favorites_user_cafe_unique UNIQUE (user_id, cafe_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);

CREATE POLICY "Users can read own favorites"
  ON public.favorites FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own favorites"
  ON public.favorites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own favorites"
  ON public.favorites FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own favorites"
  ON public.favorites FOR DELETE TO authenticated USING (user_id = auth.uid());

-- =====================================================
-- Auto-create a profile row when an auth user is created.
-- Runs SECURITY DEFINER so it bypasses RLS for the insert.
-- Covers email, Google, and Apple sign-ups uniformly.
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_first text;
  meta_last  text;
  meta_full  text;
BEGIN
  meta_first := NEW.raw_user_meta_data->>'first_name';
  meta_last  := NEW.raw_user_meta_data->>'last_name';
  meta_full  := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name'
  );

  -- OAuth providers (Google/Apple) deliver a single display name; split it as a
  -- best-effort fallback when first/last aren't supplied explicitly.
  IF meta_first IS NULL AND meta_full IS NOT NULL THEN
    meta_first := split_part(meta_full, ' ', 1);
    meta_last  := NULLIF(substr(meta_full, length(split_part(meta_full, ' ', 1)) + 2), '');
  END IF;

  INSERT INTO public.profiles (
    id, email, first_name, last_name, username, profile_image_url, onboarding_completed
  )
  VALUES (
    NEW.id,
    NEW.email,
    meta_first,
    meta_last,
    'temp_' || substr(NEW.id::text, 1, 8),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
