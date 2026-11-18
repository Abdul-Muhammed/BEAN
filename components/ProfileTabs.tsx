import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, spacing, type } from '@/constants/theme';

export type ProfileTab = 'overview' | 'diary';

/** Tab order, left to right; swiping moves along it. */
export const PROFILE_TABS: readonly ProfileTab[] = ['overview', 'diary'];

const ROW_WIDTH = 300;

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
 * and Title 1 weight over a cream rule that runs across both tabs. The ink
 * underline slides between tabs so a swipe and a tap read the same way.
 */
export default function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  const tabWidth = ROW_WIDTH / TABS.length;
  const activeIndex = Math.max(0, TABS.findIndex((t) => t.key === activeTab));
  const offset = useSharedValue(activeIndex * tabWidth);

  useEffect(() => {
    offset.set(
      withTiming(activeIndex * tabWidth, { duration: 220, easing: Easing.out(Easing.cubic) })
    );
  }, [activeIndex, tabWidth, offset]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, { width: tabWidth }, indicatorStyle]}
        />
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
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
    width: ROW_WIDTH,
    borderBottomWidth: 1,
    borderBottomColor: colors.cream,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  // Sits over the cream rule (bottom: -1) so the active tab reads as one line.
  indicator: {
    position: 'absolute',
    left: 0,
    bottom: -1,
    height: 1,
    backgroundColor: colors.ink,
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
