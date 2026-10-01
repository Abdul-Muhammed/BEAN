import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { CoffeeBean } from '../BeanRating';
import { colors, type } from '@/constants/theme';

interface BeanScoreProps {
  /** Mean rating, 0-5. Rendered to one decimal place. */
  rating: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The "Number" state of the Bean Rating component: one filled bean beside a
 * one-decimal score. The "Bean Spread" state is components/BeanRating.tsx.
 *
 * Renders nothing when there is no rating yet, since a bean next to "0.0"
 * reads as a real score of zero.
 */
export default function BeanScore({ rating, size = 16, style }: BeanScoreProps) {
  if (!rating || rating <= 0) return null;

  return (
    <View style={[styles.row, style]}>
      <CoffeeBean size={size} />
      <Text style={styles.score}>{rating.toFixed(1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  score: {
    ...type.footnote1,
    color: colors.ink,
  },
});
