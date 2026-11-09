import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import { colors, radius, spacing, type } from '@/constants/theme';
import { CHEVRON_DOWN_14_SVG, tintIcon } from '@/constants/figmaIcons';
import { ACTIVE_CHIP_BG } from './filterTypes';

interface FilterChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  /** When provided, renders a trailing ✕ that calls this instead of toggling. */
  onRemove?: () => void;
  showChevron?: boolean;
  leadingIcon?: React.ReactNode;
  /** The Figma Discover pill row: 8pt padding, 12pt regular grey label, the
   *  design-system chevron. The filters sheet keeps the default size. */
  compact?: boolean;
  style?: ViewStyle;
}

const CHEVRON_ACTIVE_SVG = tintIcon(CHEVRON_DOWN_14_SVG, '#FFFFFF');

/**
 * Shared pill used by both the summary pill row and inside the filters sheet.
 * Active = dark fill (#0F1312) with white text; inactive = white with border.
 */
export default function FilterChip({
  label,
  active = false,
  onPress,
  onRemove,
  showChevron = false,
  leadingIcon,
  compact = false,
  style,
}: FilterChipProps) {
  const restColor = compact ? colors.greyNormal : colors.primary;
  const textColor = active ? '#FFFFFF' : restColor;
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        compact && styles.chipCompact,
        active ? styles.chipActive : compact ? styles.chipCompactInactive : styles.chipInactive,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {leadingIcon}
      <Text style={[compact ? styles.labelCompact : styles.label, { color: textColor }]}>
        {label}
      </Text>
      {showChevron && !onRemove && (compact ? (
        <SvgXml
          xml={active ? CHEVRON_ACTIVE_SVG : CHEVRON_DOWN_14_SVG}
          width={14}
          height={14}
        />
      ) : (
        <ChevronDown size={14} color={textColor} />
      ))}
      {onRemove && (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={14} color={textColor} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  chipCompact: {
    borderRadius: radius.pill,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  chipActive: {
    backgroundColor: ACTIVE_CHIP_BG,
  },
  chipCompactInactive: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.separator,
  },
  chipInactive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.warmBorder,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Lato-Bold',
  },
  labelCompact: {
    ...type.footnote1,
  },
});
