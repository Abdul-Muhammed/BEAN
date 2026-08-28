import React from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MapPin } from 'lucide-react-native';
import { colors, fonts } from '@/constants/theme';

interface LocationGateOverlayProps {
  requesting?: boolean;
  /** True once the OS will no longer show its dialog, so the CTA has to send
   *  the user to Settings instead — say so rather than pretending. */
  mustUseSettings?: boolean;
  onEnable: () => void;
}

/**
 * Covers the map when we have no location. The map underneath still renders
 * (centred on Auckland) so there is visibly something to unlock, but it is
 * inert — the cafes list in the sheet below stays fully usable.
 *
 * Android note: blurring a native map surface is unreliable there even with
 * `dimezisBlurView`, so a near-opaque scrim sits *under* the blur. If the blur
 * silently no-ops the overlay is still legible; if it works, the scrim just
 * reads as a light wash.
 */
export default function LocationGateOverlay({
  requesting = false,
  mustUseSettings = false,
  onEnable,
}: LocationGateOverlayProps) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.scrim} />

      <BlurView
        intensity={Platform.OS === 'android' ? 20 : 40}
        tint="light"
        experimentalBlurMethod="dimezisBlurView"
        style={[StyleSheet.absoluteFill, styles.center]}
      >
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <MapPin size={24} color={colors.ink} />
          </View>

          <Text style={styles.title}>Turn on location</Text>
          <Text style={styles.message}>
            We need your location to show cafes near you on the map.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={onEnable}
            disabled={requesting}
            activeOpacity={0.85}
          >
            {requesting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>
                {mustUseSettings ? 'Open Settings' : 'Enable location'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
    opacity: 0.85,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.warmBorder,
    paddingHorizontal: 24,
    paddingVertical: 24,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.body,
    color: colors.mutedText,
    textAlign: 'center',
    marginBottom: 18,
  },
  button: {
    height: 46,
    paddingHorizontal: 28,
    borderRadius: 23,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
    color: colors.white,
  },
});
