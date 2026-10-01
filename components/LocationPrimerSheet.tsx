import React from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MapPin } from 'lucide-react-native';
import { colors, fonts } from '@/constants/theme';

interface LocationPrimerSheetProps {
  visible: boolean;
  requesting?: boolean;
  /** Triggers the OS permission dialog. */
  onEnable: () => void;
  /** Records the primer as seen without spending the system prompt. */
  onDismiss: () => void;
}

/**
 * Asks for location in the app's own words before the OS dialog appears.
 *
 * iOS shows its permission prompt exactly once — after a denial,
 * requestForegroundPermissionsAsync resolves denied with no UI at all. So the
 * system prompt is only ever spent on an explicit "Enable" tap here; "Not now"
 * leaves it unspent, which is what lets the fallback CTAs still succeed later.
 */
export default function LocationPrimerSheet({
  visible,
  requesting = false,
  onEnable,
  onDismiss,
}: LocationPrimerSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={requesting ? undefined : onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.iconCircle}>
            <MapPin size={26} color={colors.ink} />
          </View>

          <Text style={styles.title}>See cafes near you</Text>
          <Text style={styles.message}>
            BEAN uses your location to show what&apos;s close by and put you on the
            map. Without it we&apos;ll just show the top cafes in Auckland.
          </Text>

          <TouchableOpacity
            style={styles.enableButton}
            onPress={onEnable}
            disabled={requesting}
            activeOpacity={0.85}
          >
            {requesting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.enableText}>Enable location</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            disabled={requesting}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    alignItems: 'center',
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.separator,
    marginBottom: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.heading,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.body,
    color: colors.mutedText,
    textAlign: 'center',
    marginBottom: 24,
  },
  enableButton: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enableText: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.white,
  },
  dismissButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  dismissText: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.mutedText,
  },
});
