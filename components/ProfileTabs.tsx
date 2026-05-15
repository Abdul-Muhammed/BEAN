import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

interface ProfileTabsProps {
  activeTab: 'profile' | 'diary';
  onTabChange: (tab: 'profile' | 'diary') => void;
}

export default function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.tab}
        onPress={() => onTabChange('profile')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
          Profile
        </Text>
        {activeTab === 'profile' && <View style={styles.underline} />}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tab}
        onPress={() => onTabChange('diary')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, activeTab === 'diary' && styles.tabTextActive]}>
          Diary
        </Text>
        {activeTab === 'diary' && <View style={styles.underline} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: colors.background,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#1C1C1E',
    marginHorizontal: 20,
  },
});
