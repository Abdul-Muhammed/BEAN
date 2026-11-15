import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/constants/theme';

interface ShareTargetTileProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /**
   * Bottom-row tiles split the row evenly (flex: 1) instead of a fixed 84pt
   * width, which overflowed 375/390pt screens once four tiles sat side by side.
   */
  fixedWidth?: boolean;
  /** The Instagram mark is full-bleed art; the rest sit on a grey circle. */
  plainIcon?: boolean;
}

/** One share destination on the Share Review screen — Figma node 713:13656. */
export default function ShareTargetTile({
  icon,
  label,
  onPress,
  disabled = false,
  fixedWidth = false,
  plainIcon = false,
}: ShareTargetTileProps) {
  return (
    <TouchableOpacity
      style={[styles.tile, fixedWidth && styles.tileFixed, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.iconWrap, !plainIcon && styles.iconCircle]}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    gap: 16,
    padding: 16,
  },
  tileFixed: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  disabled: {
    opacity: 0.4,
  },
  iconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 100,
  },
  iconCircle: {
    backgroundColor: colors.greyExtraLight,
  },
  label: {
    fontFamily: 'Lato-Regular',
    fontSize: 12,
    lineHeight: 13.2,
    color: colors.greyNormal,
    textAlign: 'center',
  },
});
