import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import CafeVertCard from '../ui/CafeVertCard';
import SectionHeader from './SectionHeader';
import { PENCIL_SVG } from '@/constants/figmaIcons';
import { UserReview } from '../../data/mockData';
import { colors, spacing, type } from '@/constants/theme';
import { fetchCafesByIds } from '../../lib/topCafes';

/** The profile shows exactly three tiles. */
export const MAX_TOP_CAFES = 3;

export interface TopCafe {
  cafeId: string;
  cafeName: string;
  cafeImage: string | null;
  /** The owner's best rating for the cafe, or null for a pick they haven't reviewed. */
  rating: number | null;
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
    if (!existing || r.rating > (existing.rating ?? 0)) {
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
 *
 * Picks are drawn from the owner's reviews first, then from `extra` (cafes
 * looked up by id) for picks they haven't reviewed. A pick found in neither is
 * skipped until its lookup arrives.
 */
export function resolveTopCafes(
  reviews: UserReview[],
  topCafeIds?: string[],
  extra?: Map<string, TopCafe>
): TopCafe[] {
  const byCafe = indexByCafe(reviews);

  if (topCafeIds && topCafeIds.length > 0) {
    return topCafeIds
      .map((id) => byCafe.get(id) ?? extra?.get(id))
      .filter((cafe): cafe is TopCafe => !!cafe)
      .slice(0, MAX_TOP_CAFES);
  }

  return Array.from(byCafe.values())
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, MAX_TOP_CAFES);
}

/**
 * Looks up the hand-picked cafes that the owner's reviews can't describe, so a
 * pick from the editor's search still gets a name and photo.
 */
export function useUnreviewedTopCafes(
  reviews: UserReview[],
  topCafeIds?: string[]
): { cafes: Map<string, TopCafe>; loading: boolean } {
  const missingKey = useMemo(() => {
    const reviewed = new Set(reviews.map((r) => r.cafeId));
    return (topCafeIds ?? [])
      .slice(0, MAX_TOP_CAFES)
      .filter((id) => !reviewed.has(id))
      .join(',');
  }, [reviews, topCafeIds]);

  const [cafes, setCafes] = useState<Map<string, TopCafe>>(new Map());
  const [loadedKey, setLoadedKey] = useState('');

  useEffect(() => {
    if (!missingKey) return;
    let cancelled = false;
    fetchCafesByIds(missingKey.split(',')).then((found) => {
      if (cancelled) return;
      const next = new Map<string, TopCafe>();
      found.forEach((c, id) => next.set(id, { ...c, rating: null }));
      setCafes(next);
      setLoadedKey(missingKey);
    });
    return () => {
      cancelled = true;
    };
  }, [missingKey]);

  return { cafes, loading: missingKey !== '' && loadedKey !== missingKey };
}

export default function TopCafesSection({
  reviews,
  topCafeIds,
  onPressCafe,
  onPressEdit,
  isFavorited,
  editable = true,
}: TopCafesSectionProps) {
  const { cafes: unreviewed, loading } = useUnreviewedTopCafes(reviews, topCafeIds);
  const topCafes = useMemo(
    () => resolveTopCafes(reviews, topCafeIds, unreviewed),
    [reviews, topCafeIds, unreviewed]
  );

  // Someone else's empty list has nothing to show. Your own keeps its header
  // and pencil, so you can always get back into the editor.
  if (topCafes.length === 0 && !editable) return null;

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Top Cafes"
        action={editable ? <SvgXml xml={PENCIL_SVG} width={16} height={16} /> : undefined}
        onPressAction={onPressEdit}
        accessibilityLabel="Edit your top cafes"
      />
      {topCafes.length === 0 ? (
        loading ? null : (
          <Text style={styles.empty}>Tap the pencil to pick your top 3 cafes.</Text>
        )
      ) : (
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
      )}
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
  empty: {
    ...type.body1,
    color: colors.greyNormal,
  },
});
