import React, { useMemo } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import BeanRating from '../BeanRating';
import { colors, spacing } from '@/constants/theme';

interface RatingGraphProps {
  /** Every rating being summarised, 0.5-5. */
  ratings: number[];
  /** Overrides the mean when the caller already knows it. */
  averageRating?: number;
  style?: StyleProp<ViewStyle>;
}

const NUM_BARS = 10;
const MAX_BAR_HEIGHT = 48;
const MIN_BAR_HEIGHT = 2;

/**
 * The distribution strip from the Figma frames: a 1-bean spread, ten bars, and
 * a 5-bean spread, reading left to right as worst to best.
 *
 * The bar heights keep the gaussian shaping the previous RatingHistogram used.
 * With only a handful of reviews a literal histogram is mostly empty columns,
 * so the curve is centred on the mean and widened by the observed spread. It is
 * an impression of the distribution rather than a count per bucket.
 */
export default function RatingGraph({ ratings, averageRating, style }: RatingGraphProps) {
  const heights = useMemo(() => {
    const valid = ratings.filter((r) => r >= 0.5 && r <= 5);

    let mean = 0;
    if (typeof averageRating === 'number' && averageRating > 0) {
      mean = averageRating;
    } else if (valid.length > 0) {
      mean = valid.reduce((a, b) => a + b, 0) / valid.length;
    }

    let stdDev = 0.85;
    if (valid.length >= 3) {
      const variance =
        valid.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / valid.length;
      stdDev = Math.max(0.55, Math.min(1.4, Math.sqrt(variance) || 0.85));
    }

    const center = mean > 0 ? mean : 3;
    const raw: number[] = [];
    for (let i = 0; i < NUM_BARS; i++) {
      const x = 1 + (i / (NUM_BARS - 1)) * 4;
      raw.push(Math.exp(-0.5 * Math.pow((x - center) / stdDev, 2)));
    }

    const max = Math.max(...raw, 0.0001);
    return raw.map((h) => h / max);
  }, [ratings, averageRating]);

  const empty = ratings.length === 0;

  return (
    <View style={[styles.row, style]}>
      <BeanRating rating={1} size={12} />
      {heights.map((h, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            { height: Math.max(MIN_BAR_HEIGHT, h * MAX_BAR_HEIGHT) },
            empty && styles.barEmpty,
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
    backgroundColor: colors.accent,
  },
});
