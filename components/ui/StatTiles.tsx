import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { CoffeeBean } from '../BeanRating';
import { BOOKMARK_24_FILLED_SVG, HEART_24_FILLED_SVG } from '@/constants/figmaIcons';
import { colors, radius, spacing, type } from '@/constants/theme';

interface StatTilesProps {
  reviewsCount: number;
  favouritesCount: number;
  savedCount: number;
  onPressReviews?: () => void;
  onPressFavourites?: () => void;
  onPressSaved?: () => void;
  /** Hides Favourites and Saved, for contexts where those counts are unknown. */
  reviewsOnly?: boolean;
}

function Tile({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.tile}
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${value} ${label}`}
    >
      {icon}
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Three bordered dashboard tiles: Reviews, Favourites, Saved. The Figma order
 * inside each tile is icon, then label, then value.
 */
export default function StatTiles({
  reviewsCount,
  favouritesCount,
  savedCount,
  onPressReviews,
  onPressFavourites,
  onPressSaved,
  reviewsOnly = false,
}: StatTilesProps) {
  return (
    <View style={styles.row}>
      <Tile
        icon={<CoffeeBean size={24} />}
        label="Reviews"
        value={reviewsCount}
        onPress={onPressReviews}
      />
      {!reviewsOnly && (
        <>
          <Tile
            icon={<SvgXml xml={HEART_24_FILLED_SVG} width={24} height={24} />}
            label="Favourites"
            value={favouritesCount}
            onPress={onPressFavourites}
          />
          <Tile
            icon={<SvgXml xml={BOOKMARK_24_FILLED_SVG} width={24} height={24} />}
            label="Saved"
            value={savedCount}
            onPress={onPressSaved}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.separator,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  text: {
    gap: spacing.xs,
  },
  label: {
    ...type.footnote1,
    color: colors.slate,
    letterSpacing: -0.408,
    textAlign: 'center',
  },
  value: {
    ...type.title1,
    color: colors.ink,
    letterSpacing: -0.408,
    textAlign: 'center',
  },
});
