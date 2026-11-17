-- One-time "Share it to your Story" prompt.
--
-- After a user logs their very first review, Home shows a sheet nudging them to
-- share it as an Instagram Story. Whether they've seen it lives on the profile
-- (like tutorial_completed) so it never reappears on another device or after a
-- reinstall.
--
-- The app only shows the sheet when the user had zero reviews before submitting,
-- so existing reviewers would never see it anyway. They're backfilled to true
-- regardless, so deleting every review and starting over doesn't resurface it.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS share_prompt_seen boolean NOT NULL DEFAULT false;

UPDATE public.profiles p
  SET share_prompt_seen = true
  WHERE p.share_prompt_seen = false
    AND EXISTS (SELECT 1 FROM public.reviews r WHERE r.user_id = p.id);

COMMENT ON COLUMN public.profiles.share_prompt_seen IS
  'True once the user has seen the first-review "Share it to your Story" sheet on Home.';
