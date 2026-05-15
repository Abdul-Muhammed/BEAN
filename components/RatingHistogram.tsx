import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors } from '@/constants/theme';

interface RatingHistogramProps {
  ratings: number[];
  averageRating?: number;
  title?: string;
}

const NUM_BARS = 10;
const MAX_BAR_HEIGHT = 64;
const MIN_BAR_HEIGHT = 6;
const BROWN = '#8B5E3C';
const GREEN = '#4CAF50';

export default function RatingHistogram({
  ratings,
  averageRating,
  title = 'Ratings',
}: RatingHistogramProps) {
  const { displayMean, heights } = useMemo(() => {
    const valid = ratings.filter((r) => r >= 1 && r <= 5);

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
      const exponent = -0.5 * Math.pow((x - center) / stdDev, 2);
      raw.push(Math.exp(exponent));
    }

    const max = Math.max(...raw, 0.0001);
    const normalized = raw.map((h) => h / max);

    return { displayMean: mean, heights: normalized };
  }, [ratings, averageRating]);

  const meanLabel = displayMean > 0 ? displayMean.toFixed(1) : '—';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerRating}>
          <Star size={16} color={BROWN} fill={BROWN} />
          <Text style={styles.headerRatingText}>{meanLabel}</Text>
        </View>
      </View>

      <View style={styles.barsRow}>
        {heights.map((h, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              { height: Math.max(MIN_BAR_HEIGHT, h * MAX_BAR_HEIGHT) },
            ]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Star size={14} color={GREEN} fill={GREEN} />
          <Text style={styles.footerDash}>—</Text>
        </View>
        <View style={styles.footerRight}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} size={14} color={GREEN} fill={GREEN} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
  headerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerRatingText: {
    fontSize: 17,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: MAX_BAR_HEIGHT,
    gap: 6,
    marginBottom: 12,
  },
  bar: {
    flex: 1,
    backgroundColor: '#3A3A3C',
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerDash: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: 'Lato-Bold',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
