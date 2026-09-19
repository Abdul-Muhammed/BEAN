import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, type } from '@/constants/theme';

export type ProfileTab = 'overview' | 'diary';

interface ProfileTabsProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

const TABS: { key: ProfileTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'diary', label: 'Diary' },
];

/**
 * The two profile tabs. The frame marks the active tab with an ink underline
 * and Title 1 weight, and the inactive one with a cream underline, so the rule
 * runs unbroken across both tabs rather than sliding between them.
 */
export default function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive ? styles.tabActive : styles.tabInactive]}
              onPress={() => onTabChange(tab.key)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={isActive ? styles.labelActive : styles.labelInactive}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  row: {
    flexDirection: 'row',
    width: 300,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  tabActive: {
    borderBottomColor: colors.ink,
  },
  tabInactive: {
    borderBottomColor: colors.cream,
  },
  labelActive: {
    ...type.title1,
    color: colors.ink,
    textAlign: 'center',
  },
  labelInactive: {
    ...type.body1,
    color: colors.ink,
    textAlign: 'center',
  },
});
