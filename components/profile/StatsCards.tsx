import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { FAVORITES_SVG, DIARY_SVG, BOOKMARKS_SVG } from '@/constants/savedScreenIcons';
import { colors } from '@/constants/theme';

interface StatsCardsProps {
  reviewsCount: number;
  favouritesCount: number;
  savedCount: number;
  onPressReviews?: () => void;
  onPressFavourites?: () => void;
  onPressSaved?: () => void;
}

function StatCard({
  icon,
  value,
  label,
  onPress,
}: {
  icon: string;
  value: number;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <SvgXml xml={icon} width={34} height={26} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

/** Three equal dashboard stat cards: Reviews / Favourites / Saved. Uses the same
 *  bean / heart / bookmark badges as the Lists tab. */
export default function StatsCards({
  reviewsCount,
  favouritesCount,
  savedCount,
  onPressReviews,
  onPressFavourites,
  onPressSaved,
}: StatsCardsProps) {
  return (
    <View style={styles.container}>
      <StatCard icon={DIARY_SVG} value={reviewsCount} label="Reviews" onPress={onPressReviews} />
      <StatCard icon={FAVORITES_SVG} value={favouritesCount} label="Favourites" onPress={onPressFavourites} />
      <StatCard icon={BOOKMARKS_SVG} value={savedCount} label="Saved" onPress={onPressSaved} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 28,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECECEC',
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  value: {
    fontSize: 20,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
  label: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
});
