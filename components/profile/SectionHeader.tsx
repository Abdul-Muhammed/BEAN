import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { colors, type } from '@/constants/theme';

interface SectionHeaderProps {
  title: string;
  /** Optional right-side element, e.g. an edit pencil, arrow or bean score. */
  action?: React.ReactNode;
  onPressAction?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Heading 2 on the left with an optional tappable action on the right. Shared
 * by every titled section in the redesign: Top Cafes, Preferences, Ratings,
 * Amenities, Recent Activity and the Home feed's section bands.
 */
export default function SectionHeader({
  title,
  action,
  onPressAction,
  accessibilityLabel,
  style,
}: SectionHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title}>{title}</Text>
      {action ? (
        <TouchableOpacity
          onPress={onPressAction}
          hitSlop={10}
          activeOpacity={0.7}
          disabled={!onPressAction}
          accessibilityRole={onPressAction ? 'button' : undefined}
          accessibilityLabel={accessibilityLabel}
        >
          {action}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    ...type.h2,
    flex: 1,
    color: colors.ink,
  },
});
