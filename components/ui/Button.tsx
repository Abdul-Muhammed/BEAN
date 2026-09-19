import React from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors, radius, spacing, type } from '@/constants/theme';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  /** primary = ink ground, secondary = cream ground with an ink border. */
  variant?: 'primary' | 'secondary';
  /** Raw SVG markup for a leading icon. */
  iconXml?: string | null;
  iconSize?: number;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** The two button styles in the Figma file. Radius 8, 20/16 padding. */
export default function Button({
  label,
  onPress,
  variant = 'primary',
  iconXml,
  iconSize = 18,
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const secondary = variant === 'secondary';
  const inactive = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        secondary ? styles.secondary : styles.primary,
        inactive && styles.inactive,
        style,
      ]}
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={secondary ? colors.ink : colors.background} />
      ) : (
        <>
          {iconXml ? <SvgXml xml={iconXml} width={iconSize} height={iconSize} /> : null}
          <Text style={[styles.label, secondary ? styles.labelSecondary : styles.labelPrimary]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  primary: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  secondary: {
    backgroundColor: colors.cream,
    borderColor: colors.ink,
  },
  inactive: {
    opacity: 0.5,
  },
  label: {
    ...type.title1,
  },
  labelPrimary: {
    color: colors.background,
  },
  labelSecondary: {
    color: colors.ink,
  },
});
