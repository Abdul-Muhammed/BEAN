import React, { useMemo } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import BeanRating, { CoffeeBean } from '../BeanRating';
import { colors, spacing } from '@/constants/theme';

interface RatingGraphProps {
  /** Every rating being summarised, 0.5-5. */
  ratings: number[];
  /** Accepted for existing callers; the bars are plain counts and don't use it. */
  averageRating?: number;
  style?: StyleProp<ViewStyle>;
}

const NUM_BARS = 10;
const MAX_BAR_HEIGHT = 48;
const MIN_BAR_HEIGHT = 2;

/**
 * Counts ratings into ten half-bean buckets: index 0 is 0.5, index 9 is 5.0.
 * Ratings outside 0.5-5 are ignored.
 */
export function bucketRatings(ratings: number[]): number[] {
  const counts = new Array<number>(NUM_BARS).fill(0);
  for (const r of ratings) {
    if (!(r >= 0.5 && r <= 5)) continue;
    const i = Math.round(r * 2) - 1;
    counts[Math.min(NUM_BARS - 1, Math.max(0, i))] += 1;
  }
  return counts;
}

/**
 * The distribution strip from the Figma frames: a 1-bean marker, ten bars, and
 * a 5-bean marker, reading left to right as worst to best.
 *
 * Each bar is one rating value (0.5, 1.0 ... 5.0) and its height is how many
 * times that exact rating was given, scaled so the most common rating fills the
 * full height. A rating nobody gave shows as a thin stub so every slot stays
 * visible.
 */
export default function RatingGraph({ ratings, style }: RatingGraphProps) {
  const counts = useMemo(() => bucketRatings(ratings), [ratings]);
  const maxCount = Math.max(...counts);

  return (
    <View style={[styles.row, style]}>
      {/* One bean marks the low end and five the high end, as the frame draws
          them. A 5-bean row with one filled would read as a rating, not a scale. */}
      <CoffeeBean size={12} />
      {counts.map((count, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            count > 0
              ? { height: Math.max(MIN_BAR_HEIGHT, (count / maxCount) * MAX_BAR_HEIGHT) }
              : styles.barEmpty,
          ]}
        />
      ))}
      <BeanRating rating={5} size={12} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  bar: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  barEmpty: {
    height: MIN_BAR_HEIGHT,
    backgroundColor: colors.accent,
  },
});
