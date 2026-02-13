import { supabase } from '../../lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, username, location, preferences, firstName, lastName, email, profileImageUrl } = body;

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, email' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate username - allow empty/null for new profiles (sign-up), but require >= 4 chars when completing onboarding
    // Check if username is provided in the request body
    const usernameProvided = username !== undefined;
    const trimmedUsername = usernameProvided ? (username?.trim() || '') : undefined;
    const isCompletingOnboarding = body.onboardingCompleted === true;
    
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('clerk_user_id', userId)
      .maybeSingle();

    // If creating new profile, allow empty username (will be set during onboarding)
    // But if completing onboarding, username is required
    if (!existingProfile) {
      // Only require username if we're completing onboarding at the same time
      if (isCompletingOnboarding && (!trimmedUsername || trimmedUsername.length < 4)) {
        return new Response(
          JSON.stringify({ error: 'Username is required and must be at least 4 characters to complete onboarding' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      // For new profiles during sign-up, empty username is allowed
    } else {
      // If updating existing profile, validate username only if it's being set/changed
      // Or if completing onboarding, username must be valid
      if (isCompletingOnboarding && (!trimmedUsername || trimmedUsername.length < 4)) {
        return new Response(
          JSON.stringify({ error: 'Username must be at least 4 characters to complete onboarding' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      // If not completing onboarding but username is provided, validate it
      if (!isCompletingOnboarding && usernameProvided && trimmedUsername && trimmedUsername.length > 0 && trimmedUsername.length < 4) {
        return new Response(
          JSON.stringify({ error: 'Username must be at least 4 characters' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    if (existingProfile) {
      const updateData: any = {
        first_name: firstName || null,
        last_name: lastName || null,
        email,
        location_address: location || null,
        preferences: preferences || [],
        profile_image_url: profileImageUrl || null,
        updated_at: new Date().toISOString(),
      };

      // Update username if:
      // 1. A valid username is provided (>= 4 chars), OR
      // 2. We're completing onboarding and a valid username is provided
      if (usernameProvided && trimmedUsername && trimmedUsername.length >= 4) {
        updateData.username = trimmedUsername;
      }
      // If completing onboarding, username is required (should have been validated above)
      // This is a safety check
      else if (isCompletingOnboarding && (!trimmedUsername || trimmedUsername.length < 4)) {
        // This should not happen due to validation above, but handle it gracefully
        return new Response(
          JSON.stringify({ error: 'Username is required to complete onboarding' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (body.onboardingCompleted !== undefined) {
        updateData.onboarding_completed = body.onboardingCompleted;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('clerk_user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Profile update error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update profile', details: error.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return Response.json({
        success: true,
        message: 'Profile updated successfully',
        profile: data
      });
    }

    // Create new profile - use temporary placeholder if username is empty (will be set during onboarding)
    const insertData: any = {
      clerk_user_id: userId,
      username: (trimmedUsername && trimmedUsername.length >= 4) ? trimmedUsername : `temp_${userId.substring(0, 8)}`,
      first_name: firstName || null,
      last_name: lastName || null,
      email,
      location_address: location || null,
      preferences: preferences || [],
      profile_image_url: profileImageUrl || null,
      onboarding_completed: body.onboardingCompleted !== undefined ? body.onboardingCompleted : false,
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Profile creation error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create profile', details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return Response.json({
      success: true,
      message: 'Profile created successfully',
      profile: data
    });
  } catch (error) {
    console.error('Profile creation error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create profile', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}