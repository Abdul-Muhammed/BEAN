import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors, radius, softShadow, spacing } from '@/constants/theme';

interface HeroPillButtonProps {
  xml: string;
  onPress: () => void;
  /** Which edge of the hero to pin to. */
  side: 'left' | 'right';
  label: string;
}

/**
 * A floating circular button over a hero image, used by both the cafe page and
 * the review page. Sharing it keeps the back arrow and the trailing action
 * provably identical in size, border and shadow across the two screens.
 */
export default function HeroPillButton({ xml, onPress, side, label }: HeroPillButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, side === 'left' ? styles.left : styles.right]}
      onPress={onPress}
      hitSlop={8}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <SvgXml xml={xml} width={16} height={16} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.ink,
    backgroundColor: colors.background,
    ...softShadow,
  },
  left: {
    left: spacing.md,
  },
  right: {
    right: spacing.md,
  },
});
