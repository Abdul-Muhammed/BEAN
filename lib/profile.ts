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
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  return data;
}
