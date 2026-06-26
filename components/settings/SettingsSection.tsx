import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

interface SettingsSectionProps {
  children: React.ReactNode;
}

/** Grouped iOS-style card. Inserts thin dividers between each child row. */
export default function SettingsSection({ children }: SettingsSectionProps) {
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={styles.section}>
      {items.map((child, index) => (
        <View key={index}>
          {index > 0 ? <View style={styles.divider} /> : null}
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECECEC',
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: '#ECECEC',
    marginLeft: 16,
  },
});
