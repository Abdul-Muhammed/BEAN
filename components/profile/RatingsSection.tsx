import React from 'react';
import { View, StyleSheet } from 'react-native';
import RatingHistogram from '../RatingHistogram';

interface RatingsSectionProps {
  ratings: number[];
  averageRating: number;
}

/** Profile dashboard ratings distribution — wraps the shared RatingHistogram in
 *  its roomier `large` variant with section spacing. */
export default function RatingsSection({ ratings, averageRating }: RatingsSectionProps) {
  return (
    <View style={styles.container}>
      <RatingHistogram
        ratings={ratings}
        averageRating={averageRating}
        title="Ratings Distribution"
        large
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
});
