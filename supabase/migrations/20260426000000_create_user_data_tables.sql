/*
  # Create User Data Tables (reviews, bookmarks, favorites)

  Persists per-user reviews, bookmarked cafes, and favorited cafes
  keyed by clerk_user_id so data survives logout/login.
*/

-- =====================================================
-- reviews
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id text NOT NULL,
  cafe_id text NOT NULL,
  cafe_place_id text,
  cafe_name text NOT NULL,
  cafe_image text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text text,
  attributes text[] DEFAULT '{}',
  photos text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reviews_clerk_user_id ON public.reviews(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_cafe_id ON public.reviews(cafe_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can update reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can delete reviews" ON public.reviews;

CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Anyone can insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update reviews" ON public.reviews FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete reviews" ON public.reviews FOR DELETE USING (true);

-- =====================================================
-- bookmarks
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id text NOT NULL,
  cafe_id text NOT NULL,
  cafe_place_id text,
  cafe_name text NOT NULL,
  cafe_image text,
  cafe_location text,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT bookmarks_user_cafe_unique UNIQUE (clerk_user_id, cafe_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_clerk_user_id ON public.bookmarks(clerk_user_id);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Anyone can insert bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Anyone can update bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Anyone can delete bookmarks" ON public.bookmarks;

CREATE POLICY "Anyone can read bookmarks" ON public.bookmarks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert bookmarks" ON public.bookmarks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update bookmarks" ON public.bookmarks FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete bookmarks" ON public.bookmarks FOR DELETE USING (true);

-- =====================================================
-- favorites
-- =====================================================
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id text NOT NULL,
  cafe_id text NOT NULL,
  cafe_place_id text,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT favorites_user_cafe_unique UNIQUE (clerk_user_id, cafe_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_clerk_user_id ON public.favorites(clerk_user_id);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read favorites" ON public.favorites;
DROP POLICY IF EXISTS "Anyone can insert favorites" ON public.favorites;
DROP POLICY IF EXISTS "Anyone can update favorites" ON public.favorites;
DROP POLICY IF EXISTS "Anyone can delete favorites" ON public.favorites;

CREATE POLICY "Anyone can read favorites" ON public.favorites FOR SELECT USING (true);
CREATE POLICY "Anyone can insert favorites" ON public.favorites FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update favorites" ON public.favorites FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete favorites" ON public.favorites FOR DELETE USING (true);
