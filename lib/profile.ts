import { supabase } from './supabase';

export interface CreateProfileParams {
  userId: string;
  username?: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  profileImageUrl?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  preferences?: string[];
  onboardingCompleted?: boolean;
}

export async function createOrUpdateProfile(params: CreateProfileParams) {
  const {
    userId,
    username,
    firstName,
    lastName,
    email,
    profileImageUrl,
    location,
    latitude,
    longitude,
    preferences = [],
    onboardingCompleted = false,
  } = params;

  if (!userId || !email) {
    throw new Error('Missing required fields: userId, email');
  }

  // Check if profile exists
  console.log('🔍 Checking for existing profile for userId:', userId);
  const { data: existingProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('clerk_user_id', userId)
    .maybeSingle();

  if (fetchError) {
    console.error('❌ Error fetching existing profile:', fetchError);
    throw new Error(`Failed to fetch profile: ${fetchError.message}`);
  }

  console.log('📋 Existing profile:', existingProfile ? 'Found' : 'Not found');

  const usernameProvided = username !== undefined;
  const trimmedUsername = usernameProvided ? (username?.trim() || '') : undefined;
  const isCompletingOnboarding = onboardingCompleted === true;

  // Validate username if completing onboarding
  if (isCompletingOnboarding && (!trimmedUsername || trimmedUsername.length < 4)) {
    throw new Error('Username is required and must be at least 4 characters to complete onboarding');
  }

  if (existingProfile) {
    // Update existing profile
    const updateData: any = {
      first_name: firstName || null,
      last_name: lastName || null,
      email,
      location_address: location || null,
      preferences: preferences || [],
      profile_image_url: profileImageUrl || null,
      updated_at: new Date().toISOString(),
    };

    if (typeof latitude === 'number' && typeof longitude === 'number') {
      updateData.location_latitude = latitude;
      updateData.location_longitude = longitude;
    }

    // Update username if provided and valid
    if (usernameProvided && trimmedUsername && trimmedUsername.length >= 4) {
      updateData.username = trimmedUsername;
    }

    // Safety check: if completing onboarding, username must be set
    if (isCompletingOnboarding && (!trimmedUsername || trimmedUsername.length < 4)) {
      throw new Error('Username is required to complete onboarding');
    }

    if (onboardingCompleted !== undefined) {
      updateData.onboarding_completed = onboardingCompleted;
    }

    console.log('🔄 Updating profile with data:', updateData);
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('clerk_user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Profile update error:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    console.log('✅ Profile updated successfully:', data);
    return data;
  } else {
    // Create new profile
    // Use temporary placeholder if username is empty (will be set during onboarding)
    const insertData: any = {
      clerk_user_id: userId,
      username: (trimmedUsername && trimmedUsername.length >= 4) 
        ? trimmedUsername 
        : `temp_${userId.substring(0, 8)}`,
      first_name: firstName || null,
      last_name: lastName || null,
      email,
      location_address: location || null,
      location_latitude: typeof latitude === 'number' ? latitude : null,
      location_longitude: typeof longitude === 'number' ? longitude : null,
      preferences: preferences || [],
      profile_image_url: profileImageUrl || null,
      onboarding_completed: onboardingCompleted,
    };

    console.log('➕ Creating new profile with data:', insertData);
    const { data, error } = await supabase
      .from('profiles')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('❌ Profile creation error:', error);
      throw new Error(`Failed to create profile: ${error.message}`);
    }

    console.log('✅ Profile created successfully:', data);
    return data;
  }
}

