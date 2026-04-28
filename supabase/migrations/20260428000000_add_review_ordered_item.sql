/*
  # Add ordered item to reviews

  Stores what the user ordered as structured review data so it can be
  displayed in the diary separately from free-form notes.
*/

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS ordered_item text;
