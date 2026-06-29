import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';
import { colors } from '@/constants/theme';
import { ACTIVE_CHIP_BG } from './filterTypes';

interface FilterChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  /** When provided, renders a trailing ✕ that calls this instead of toggling. */
  onRemove?: () => void;
  showChevron?: boolean;
  leadingIcon?: React.ReactNode;
  style?: ViewStyle;
}

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
  style,
}: FilterChipProps) {
  const textColor = active ? '#FFFFFF' : colors.primary;
  return (
    <TouchableOpacity
      style={[styles.chip, active ? styles.chipActive : styles.chipInactive, style]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {leadingIcon}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      {showChevron && !onRemove && (
        <ChevronDown size={14} color={textColor} />
      )}
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
  chipActive: {
    backgroundColor: ACTIVE_CHIP_BG,
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
});
