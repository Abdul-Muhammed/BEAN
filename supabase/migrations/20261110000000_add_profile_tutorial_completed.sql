-- One-time post-onboarding tutorial.
--
-- New users see a four-step tutorial sheet over Home right after onboarding.
-- Whether they've finished (or skipped) it lives on the profile rather than in
-- AsyncStorage so it follows the account across devices and reinstalls.
--
-- New rows get false from the column default (the handle_new_user trigger
-- doesn't name the column). Everyone who already finished onboarding is
-- backfilled to true so existing users never see the tutorial.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tutorial_completed boolean NOT NULL DEFAULT false;

UPDATE public.profiles
  SET tutorial_completed = true
  WHERE onboarding_completed = true
    AND tutorial_completed = false;

COMMENT ON COLUMN public.profiles.tutorial_completed IS
  'True once the user has finished or skipped the post-onboarding tutorial sheet on Home.';
