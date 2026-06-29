import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Local persistence key for the user's notifications preference. This is a
// device-local flag (no DB column) — it records whether the user has opted in
// from our Notifications screen. The OS permission is the hard gate; this is the
// app-level intent layered on top of it.
const NOTIFICATIONS_ENABLED_KEY = 'bean:notificationsEnabled';

// Device-local timestamp (ms epoch) of the last time the user opened the
// Notifications screen. Anything newer than this is rendered as "unread"
// (beige) since there is no server-side read state.
const NOTIFICATIONS_LAST_SEEN_KEY = 'bean:notificationsLastSeen';

/**
 * Read the last-seen timestamp (ms epoch). On first run (key absent) we seed it
 * to now and persist it, so a fresh install / new device doesn't flag every
 * historical follow as unread (which would otherwise light the bell dot and turn
 * the whole Notifications screen beige). Only activity since this moment counts.
 */
export async function getNotificationsLastSeen(): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(NOTIFICATIONS_LAST_SEEN_KEY);
    if (value === null) {
      const now = Date.now();
      await AsyncStorage.setItem(NOTIFICATIONS_LAST_SEEN_KEY, String(now));
      return now;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

/** Mark all notifications as seen by persisting the current time. */
export async function setNotificationsLastSeenNow(): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_LAST_SEEN_KEY, String(Date.now()));
  } catch {
    // Non-fatal: unread styling simply persists until the next successful write.
  }
}

/** Read the persisted notifications preference. Defaults to false. */
export async function getNotificationsEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/** Persist the notifications preference locally. */
export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {
    // Non-fatal: the toggle still reflects the in-memory state for this session.
  }
}

/** Whether the OS has already granted notification permission. */
export async function hasNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Request OS notification permission. Returns true when granted. Safe to call
 * repeatedly — if already granted it resolves true without re-prompting.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}
