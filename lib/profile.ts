import { supabase } from './supabase';

export interface UpdateProfileParams {
  username?: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  preferences?: string[];
  onboardingCompleted?: boolean;
}

/**
 * Checks whether a username is free to claim (case-insensitive). Returns true
 * when no other profile already holds it. `excludeUserId` lets a user keep their
 * own current handle without it reading as "taken".
 *
 * Mirrors the DB-level partial unique index on lower(username); the index is the
 * source of truth, this is just for friendly inline feedback.
 */
export async function isUsernameAvailable(
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  const trimmed = username.trim();
  if (trimmed.length < 4) return false;

  // ilike does a case-insensitive match (lining up with the lower(username)
  // unique index) but treats %, _ and \ as wildcards, so escape them to keep
  // this an exact-handle comparison.
  const escaped = trimmed.replace(/[\\%_]/g, (ch) => `\\${ch}`);

  let query = supabase
    .from('profiles')
    .select('id')
    .ilike('username', escaped)
    .limit(1);

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { data, error } = await query;
  if (error) {
    // Surface to the caller so it can decide how to treat an inconclusive check.
    throw new Error(`Failed to check username: ${error.message}`);
  }

  return (data?.length ?? 0) === 0;
}

/**
 * Updates the signed-in user's profile row. The row itself is created by the
 * handle_new_user database trigger at sign-up, so this only ever updates.
 * Scoped to the auth user via id = auth.uid() (enforced by RLS).
 */
export async function updateProfile(params: UpdateProfileParams) {
  const {
    username,
    firstName,
    lastName,
    profileImageUrl,
    location,
    latitude,
    longitude,
    preferences,
    onboardingCompleted,
  } = params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const usernameProvided = username !== undefined;
  const trimmedUsername = usernameProvided ? (username?.trim() || '') : undefined;
  const isCompletingOnboarding = onboardingCompleted === true;

  if (isCompletingOnboarding && (!trimmedUsername || trimmedUsername.length < 4)) {
    throw new Error('Username is required and must be at least 4 characters to complete onboarding');
  }

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (usernameProvided && trimmedUsername && trimmedUsername.length >= 4) {
    updateData.username = trimmedUsername;
  }
  if (firstName !== undefined) updateData.first_name = firstName || null;
  if (lastName !== undefined) updateData.last_name = lastName || null;
  if (profileImageUrl !== undefined) updateData.profile_image_url = profileImageUrl || null;
  if (location !== undefined) updateData.location_address = location || null;
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    updateData.location_latitude = latitude;
    updateData.location_longitude = longitude;
  }
  if (preferences !== undefined) updateData.preferences = preferences || [];
  if (onboardingCompleted !== undefined) updateData.onboarding_completed = onboardingCompleted;

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    // 23505 = unique_violation. The only user-facing unique constraint here is
    // the case-insensitive username index, so map it to a clear message.
    if (error.code === '23505') {
      throw new Error('That username is already taken. Please choose another.');
    }
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  return data;
}
