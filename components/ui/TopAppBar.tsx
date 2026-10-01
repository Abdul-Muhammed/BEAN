import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors, spacing, type } from '@/constants/theme';

interface TopAppBarProps {
  title: string;
  /** Raw SVG markup for the leading slot, e.g. a back arrow or settings cog. */
  leadingXml?: string | null;
  onPressLeading?: () => void;
  leadingLabel?: string;
  trailingXml?: string | null;
  onPressTrailing?: () => void;
  trailingLabel?: string;
}

function BarButton({
  xml,
  onPress,
  label,
}: {
  xml?: string | null;
  onPress?: () => void;
  label?: string;
}) {
  // An empty slot still occupies 24pt so the title stays optically centred
  // whether one side has an icon or both do.
  if (!xml) return <View style={styles.slot} />;

  return (
    <TouchableOpacity
      style={styles.slot}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={12}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <SvgXml xml={xml} width={24} height={24} />
    </TouchableOpacity>
  );
}

/**
 * The 64pt top app bar from the Figma frames: a 24pt icon slot, a centred
 * Title 1 heading, and a second icon slot. Replaces the two near-identical
 * headers that existed for the own-profile and other-profile screens.
 */
export default function TopAppBar({
  title,
  leadingXml,
  onPressLeading,
  leadingLabel,
  trailingXml,
  onPressTrailing,
  trailingLabel,
}: TopAppBarProps) {
  return (
    <View style={styles.bar}>
      <BarButton xml={leadingXml} onPress={onPressLeading} label={leadingLabel} />
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <BarButton xml={trailingXml} onPress={onPressTrailing} label={trailingLabel} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  slot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...type.title1,
    flex: 1,
    color: colors.ink,
    textAlign: 'center',
  },
});
