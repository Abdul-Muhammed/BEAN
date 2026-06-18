/*
  # Enforce unique usernames (case-insensitive)

  Usernames must be globally unique so the planned "add your friends" feature can
  resolve a person by their handle. Uniqueness is case-insensitive ('Humza' and
  'humza' are the same handle).

  The handle_new_user() trigger seeds every fresh auth user with a placeholder
  username of the form 'temp_<uuid prefix>'. Those are exempt from the constraint
  via a partial index so a sign-up can never fail on the placeholder; real
  usernames (chosen during onboarding) are the only ones constrained.

  The plain idx_profiles_username index is replaced by this one.
*/

-- Drop the old non-unique lookup index; the new unique index serves lookups too.
DROP INDEX IF EXISTS public.idx_profiles_username;

-- Case-insensitive uniqueness on real (non-placeholder) usernames only.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower_unique
  ON public.profiles (lower(username))
  WHERE username NOT LIKE 'temp\_%';
