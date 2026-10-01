import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import { useAuth } from '../context/AuthContext';
import { useUserProfile } from './useUserProfile';
import { updateProfile } from '../lib/profile';
import { approximateDistanceMeters } from '../lib/geo';

export interface Coords {
  latitude: number;
  longitude: number;
}

/** Where the app centres itself when it has no idea where the user is. Every
 *  screen reads this one constant rather than re-hardcoding the pair. */
export const AUCKLAND_CBD: Coords = { latitude: -36.8485, longitude: 174.7633 };

/** Only re-fetch (and re-persist) once the user has moved past this, so a
 *  screen focus that didn't move them costs nothing. */
export const LOCATION_REFRESH_THRESHOLD_METERS = 250;

/** Per-device, not per-user: permission is a property of the install. */
const PRIMER_SEEN_KEY = '@bean/location_primer_seen';

export type LocationStatus =
  | 'checking'
  | 'undetermined'
  | 'granted'
  | 'denied';

interface LocationContextValue {
  status: LocationStatus;
  /** Live GPS when granted, else the coordinates saved on the profile, else null. */
  coords: Coords | null;
  /** True when we have no coordinates at all — screens should show the
   *  Auckland fallback (top-rated list, blurred map). */
  isFallback: boolean;
  /** False once the OS will no longer show its dialog; requestPermission()
   *  then routes to Settings instead. */
  canAskAgain: boolean;
  /** True when the in-app primer should be shown before spending the single
   *  iOS system prompt. */
  shouldShowPrimer: boolean;
  /** Records that the primer was seen without requesting anything. */
  dismissPrimer: () => Promise<void>;
  /** Shows the OS prompt (or opens Settings when it can no longer be shown).
   *  Resolves true when permission ends up granted. */
  requestPermission: () => Promise<boolean>;
}

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

/**
 * Single shared source of truth for the device's location permission and
 * coordinates.
 *
 * Mounted once in the root layout so Home and Discover agree: granting
 * permission from the blurred map immediately un-gates Home's nearby list,
 * which independent per-screen hooks could not do.
 *
 * Also owns persistence — a granted fix is written back to
 * `profiles.location_latitude/longitude` so a cold start has somewhere to
 * centre before GPS resolves.
 */
export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { profile, refetch: refetchProfile } = useUserProfile();

  const [status, setStatus] = useState<LocationStatus>('checking');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [deviceCoords, setDeviceCoords] = useState<Coords | null>(null);
  const [primerSeen, setPrimerSeen] = useState<boolean | null>(null);

  // Last coordinates written to the profile, so we only pay for a write when
  // the user has actually moved.
  const lastPersistedRef = useRef<Coords | null>(null);
  const fetchingRef = useRef(false);

  const profileCoords = useMemo<Coords | null>(() => {
    const lat = profile?.location_latitude;
    const lng = profile?.location_longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    return { latitude: lat, longitude: lng };
  }, [profile?.location_latitude, profile?.location_longitude]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(PRIMER_SEEN_KEY)
      .then((value) => {
        if (!cancelled) setPrimerSeen(value === 'true');
      })
      .catch(() => {
        // Treat an unreadable flag as "not seen"; showing the primer twice is
        // harmless, silently skipping it is not.
        if (!cancelled) setPrimerSeen(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const markPrimerSeen = useCallback(async () => {
    setPrimerSeen(true);
    try {
      await AsyncStorage.setItem(PRIMER_SEEN_KEY, 'true');
    } catch {
      // Non-fatal: worst case the primer reappears next launch.
    }
  }, []);

  // Read a fresh fix and persist it. Only called once permission is granted.
  const captureCoords = useCallback(async (): Promise<Coords | null> => {
    if (fetchingRef.current) return null;
    fetchingRef.current = true;
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const next: Coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setDeviceCoords(next);

      // Persist so a cold start (or a screen that renders before GPS resolves)
      // has a sensible centre. Skipped while signed out, and while the user
      // hasn't meaningfully moved.
      const baseline = lastPersistedRef.current ?? profileCoords;
      const moved =
        !baseline ||
        approximateDistanceMeters(
          baseline.latitude,
          baseline.longitude,
          next.latitude,
          next.longitude
        ) >= LOCATION_REFRESH_THRESHOLD_METERS;

      if (user && moved) {
        try {
          await updateProfile({ latitude: next.latitude, longitude: next.longitude });
          lastPersistedRef.current = next;
          await refetchProfile();
        } catch (err) {
          // A failed write must not cost the user their working location.
          console.warn('Failed to persist location to profile:', err);
        }
      }

      return next;
    } catch (err) {
      console.warn('Failed to read device location:', err);
      return null;
    } finally {
      fetchingRef.current = false;
    }
  }, [user, profileCoords, refetchProfile]);

  // Check the existing permission on mount. `getForegroundPermissionsAsync`
  // reads state without prompting, which is what protects the single iOS
  // dialog for the primer's Enable button.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (cancelled) return;

        setCanAskAgain(permission.canAskAgain !== false);

        if (permission.granted) {
          setStatus('granted');
          await captureCoords();
        } else {
          setStatus(permission.canAskAgain === false ? 'denied' : 'undetermined');
        }
      } catch {
        if (!cancelled) setStatus('undetermined');
      }
    })();

    return () => {
      cancelled = true;
    };
    // Deliberately once on mount; requestPermission handles later transitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    await markPrimerSeen();

    // Once the OS will no longer show its dialog, asking again returns denied
    // with no UI at all — Settings is the only real path back.
    if (!canAskAgain) {
      try {
        await Linking.openSettings();
      } catch (err) {
        console.warn('Failed to open system settings:', err);
      }
      return false;
    }

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      setCanAskAgain(permission.canAskAgain !== false);

      if (!permission.granted) {
        setStatus(permission.canAskAgain === false ? 'denied' : 'undetermined');
        return false;
      }

      setStatus('granted');
      await captureCoords();
      return true;
    } catch (err) {
      console.warn('Location permission request failed:', err);
      return false;
    }
  }, [canAskAgain, captureCoords, markPrimerSeen]);

  const dismissPrimer = useCallback(async () => {
    await markPrimerSeen();
  }, [markPrimerSeen]);

  // Live GPS wins; the saved profile fix covers the window before it resolves.
  const coords = deviceCoords ?? profileCoords;

  const value = useMemo<LocationContextValue>(
    () => ({
      status,
      coords,
      isFallback: coords === null,
      canAskAgain,
      // Never race the OS check or the stored flag — a primer shown over a
      // permission we already hold reads as a bug.
      shouldShowPrimer:
        status === 'undetermined' && primerSeen === false && coords === null,
      dismissPrimer,
      requestPermission,
    }),
    [status, coords, canAskAgain, primerSeen, dismissPrimer, requestPermission]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation(): LocationContextValue {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
