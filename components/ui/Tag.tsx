import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors, radius, spacing, type } from '@/constants/theme';

export type TagVariant = 'outline' | 'outlineDark' | 'filled';
export type TagSize = 's' | 'm';

interface TagProps {
  label: string;
  /** Raw SVG markup, from constants/figmaIcons.ts or cafe_categories. */
  iconXml?: string | null;
  /** outline = grey border (default), outlineDark = ink border, filled = ink ground. */
  variant?: TagVariant;
  /** s = 12pt text with tight padding, m = 14pt. */
  size?: TagSize;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * The pill chip that recurs across every frame: home filters, cafe amenities,
 * review attributes, profile preferences and the n/3 counter. These differ only
 * by border colour, ground and text size, so they are one component rather than
 * five near-copies.
 */
export default function Tag({
  label,
  iconXml,
  variant = 'outline',
  size = 'm',
  onPress,
  style,
}: TagProps) {
  const filled = variant === 'filled';
  const iconSize = size === 's' ? 12 : 16;

  const body = (
    <View
      style={[
        styles.base,
        size === 's' ? styles.sizeS : styles.sizeM,
        variant === 'outlineDark' && styles.outlineDark,
        filled && styles.filled,
        style,
      ]}
    >
      {iconXml ? <SvgXml xml={iconXml} width={iconSize} height={iconSize} /> : null}
      <Text
        style={[
          size === 's' ? styles.textS : styles.textM,
          filled && styles.textFilled,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) return body;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      {body}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.separator,
    backgroundColor: colors.background,
  },
  sizeS: {
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sizeM: {
    gap: spacing.sm,
    padding: spacing.sm,
  },
  outlineDark: {
    borderColor: colors.ink,
  },
  filled: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  textS: {
    ...type.footnote1,
    color: colors.ink,
    textAlign: 'center',
  },
  textM: {
    ...type.body1,
    color: colors.ink,
    textAlign: 'center',
  },
  textFilled: {
    color: colors.background,
  },
});
