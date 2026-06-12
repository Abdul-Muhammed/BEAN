import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  location_address: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  preferences: any;
  profile_image_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface UserProfileContextValue {
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  /** Force a refetch of the profile. Awaitable so callers can ensure the
   *  shared state is fresh before navigating (e.g. completing onboarding). */
  refetch: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextValue | undefined>(
  undefined
);

/**
 * Single shared source of truth for the signed-in user's profile. Mounting this
 * once (in the root layout) means every consumer — including the AuthGate guard —
 * reads the same row and sees the same updates, instead of each component caching
 * its own stale copy.
 */
export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded: isUserLoaded } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (fetchingRef.current) {
      return;
    }

    if (!user?.id) {
      setIsLoading(false);
      setProfile(null);
      setError(null);
      lastUserIdRef.current = null;
      return;
    }

    // If we already fetched for this user ID, skip (refetch() clears the ref to force)
    if (lastUserIdRef.current === user.id) {
      setIsLoading(false);
      return;
    }

    try {
      fetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        // Only log if it's a real error, not just "no rows returned" (PGRST116)
        // PGRST116 means no rows found, which is normal if profile doesn't exist yet
        if (fetchError.code !== 'PGRST116' && fetchError.code !== '42P01') {
          console.error('Error fetching profile:', fetchError);
        }
        setError(fetchError);
        setProfile(null);
      } else {
        setProfile(data);
        setError(null);
      }
      // Mark that we've fetched for this user (even if no profile found)
      lastUserIdRef.current = user.id;
    } catch (err) {
      // Only log unexpected errors (not "no rows" errors)
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (!errorMessage.includes('PGRST116') && !errorMessage.includes('42P01')) {
        console.error('Error fetching profile:', err);
      }
      setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
      setProfile(null);
      // Still mark as fetched to prevent infinite retries
      lastUserIdRef.current = user.id;
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    if (isUserLoaded && user?.id) {
      // Reset if user changed
      if (lastUserIdRef.current !== user.id) {
        setProfile(null);
        setError(null);
      }
      fetchProfile();
    } else if (isUserLoaded && !user?.id) {
      // User not signed in
      setIsLoading(false);
      setProfile(null);
      setError(null);
    }
  }, [user?.id, isUserLoaded, fetchProfile]);

  const refetch = useCallback(async () => {
    lastUserIdRef.current = null; // Force refetch
    await fetchProfile();
  }, [fetchProfile]);

  return (
    <UserProfileContext.Provider
      value={{ profile, isLoading: isLoading || !isUserLoaded, error, refetch }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile(): UserProfileContextValue {
  const ctx = useContext(UserProfileContext);
  if (ctx === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return ctx;
}
