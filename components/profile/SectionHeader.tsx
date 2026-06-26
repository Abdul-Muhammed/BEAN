import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface SectionHeaderProps {
  title: string;
  /** Optional right-side icon/element (e.g. an edit pencil or arrow). */
  action?: React.ReactNode;
  onPressAction?: () => void;
}

/** Title on the left with an optional tappable action on the right. Shared by
 *  the Overview dashboard sections (Top Cafes, Preferences, Recent Activity). */
export default function SectionHeader({ title, action, onPressAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ? (
        <TouchableOpacity
          onPress={onPressAction}
          hitSlop={10}
          activeOpacity={0.7}
          disabled={!onPressAction}
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
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
  },
});
