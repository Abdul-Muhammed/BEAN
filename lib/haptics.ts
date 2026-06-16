import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** Light tactile tap for toggle actions (save / favorite). Safe no-op on web or if unavailable. */
export function triggerSaveHaptic() {
  if (Platform.OS === 'web') return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // haptics unavailable on this device — ignore
  }
}
