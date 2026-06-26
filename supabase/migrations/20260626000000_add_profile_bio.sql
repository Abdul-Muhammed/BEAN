-- Add a freeform bio to user profiles.
--
-- The redesigned profile screen surfaces a short bio under the avatar, and the
-- new Edit Profile screen lets users set it (capped at 150 chars in the UI). The
-- column is nullable so existing rows keep working with no bio.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text;
