import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Local persistence key for the user's notifications preference. This is a
// device-local flag (no DB column) — it records whether the user has opted in
// from our Notifications screen. The OS permission is the hard gate; this is the
// app-level intent layered on top of it.
const NOTIFICATIONS_ENABLED_KEY = 'bean:notificationsEnabled';

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
