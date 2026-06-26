import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { colors } from '@/constants/theme';

export type ProfileTab = 'overview' | 'diary';

interface ProfileTabsProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

const TABS: { key: ProfileTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'diary', label: 'Diary' },
];

const H_PADDING = 20;

export default function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  const { width } = useWindowDimensions();
  const tabWidth = (width - H_PADDING * 2) / TABS.length;
  const activeIndex = TABS.findIndex((t) => t.key === activeTab);
  const translateX = useRef(new Animated.Value(activeIndex * tabWidth)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: activeIndex * tabWidth,
      useNativeDriver: true,
      bounciness: 4,
      speed: 16,
    }).start();
  }, [activeIndex, tabWidth, translateX]);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => onTabChange(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Animated.View
        style={[
          styles.underline,
          { width: tabWidth, transform: [{ translateX }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: H_PADDING,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: colors.background,
  },
  row: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  tabText: {
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
  tabTextActive: {
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
  underline: {
    height: 2,
    backgroundColor: '#1C1C1E',
    borderRadius: 1,
  },
});
