import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import CafeVertCard from '../ui/CafeVertCard';
import SectionHeader from './SectionHeader';
import { PENCIL_SVG } from '@/constants/figmaIcons';
import { UserReview } from '../../data/mockData';
import { spacing } from '@/constants/theme';

/** The profile shows exactly three tiles. */
export const MAX_TOP_CAFES = 3;

export interface TopCafe {
  cafeId: string;
  cafeName: string;
  cafeImage: string;
  rating: number;
}

interface TopCafesSectionProps {
  reviews: UserReview[];
  /** Hand-picked cafe ids from profiles.top_cafes, in display order. */
  topCafeIds?: string[];
  onPressCafe?: (cafeId: string) => void;
  onPressEdit?: () => void;
  isFavorited?: (cafeId: string) => boolean;
  /** Hidden when viewing another user's profile. */
  editable?: boolean;
}

/**
 * Index the reviewer's own reviews by cafe, keeping the best rating per cafe.
 * A review is the only place a name and image for a cafe are guaranteed to be
 * available for an arbitrary user, including one whose profile you are viewing.
 */
export function indexByCafe(reviews: UserReview[]): Map<string, TopCafe> {
  const byCafe = new Map<string, TopCafe>();
  for (const r of reviews) {
    const existing = byCafe.get(r.cafeId);
    if (!existing || r.rating > existing.rating) {
      byCafe.set(r.cafeId, {
        cafeId: r.cafeId,
        cafeName: r.cafeName,
        cafeImage: r.cafeImage,
        rating: r.rating,
      });
    }
  }
  return byCafe;
}

/**
 * Resolve the tiles to show. A hand-picked list wins; before the user has ever
 * opened the editor that list is empty, so the section falls back to their
 * three highest-rated cafes rather than showing nothing.
 */
export function resolveTopCafes(reviews: UserReview[], topCafeIds?: string[]): TopCafe[] {
  const byCafe = indexByCafe(reviews);

  if (topCafeIds && topCafeIds.length > 0) {
    return topCafeIds
      .map((id) => byCafe.get(id))
      .filter((cafe): cafe is TopCafe => !!cafe)
      .slice(0, MAX_TOP_CAFES);
  }

  return Array.from(byCafe.values())
    .sort((a, b) => b.rating - a.rating)
    .slice(0, MAX_TOP_CAFES);
}

export default function TopCafesSection({
  reviews,
  topCafeIds,
  onPressCafe,
  onPressEdit,
  isFavorited,
  editable = true,
}: TopCafesSectionProps) {
  const topCafes = useMemo(
    () => resolveTopCafes(reviews, topCafeIds),
    [reviews, topCafeIds]
  );

  if (topCafes.length === 0) return null;

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Top Cafes"
        action={editable ? <SvgXml xml={PENCIL_SVG} width={16} height={16} /> : undefined}
        onPressAction={onPressEdit}
        accessibilityLabel="Edit your top cafes"
      />
      <View style={styles.grid}>
        {topCafes.map((cafe) => (
          <CafeVertCard
            key={cafe.cafeId}
            name={cafe.cafeName}
            imageUri={cafe.cafeImage}
            rating={cafe.rating}
            favorited={isFavorited?.(cafe.cafeId)}
            onPress={() => onPressCafe?.(cafe.cafeId)}
          />
        ))}
        {/* Keeps a short list left-aligned on the same 3-up rhythm rather than
            letting one or two tiles stretch across the row. */}
        {Array.from({ length: MAX_TOP_CAFES - topCafes.length }).map((_, i) => (
          <View key={`spacer-${i}`} style={styles.spacer} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  spacer: {
    flex: 1,
  },
});
