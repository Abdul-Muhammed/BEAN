/*
  # Add visit_date and half-star rating support to reviews

  - Adds nullable `visit_date` (date) column so we can persist the date the
    user actually visited the cafe, separate from `created_at`.
  - Relaxes the rating constraint from integer 1..5 to numeric 0.5..5 in
    0.5 increments so users can leave half-star ratings (e.g. 3.5).
*/

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS visit_date date;

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_rating_check;

ALTER TABLE public.reviews
  ALTER COLUMN rating TYPE numeric(2,1) USING rating::numeric(2,1);

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_rating_check
  CHECK (rating >= 0.5 AND rating <= 5 AND (rating * 2) = floor(rating * 2));
