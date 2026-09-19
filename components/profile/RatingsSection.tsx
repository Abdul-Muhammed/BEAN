import React from 'react';
import { View, StyleSheet } from 'react-native';
import BeanScore from '../ui/BeanScore';
import RatingGraph from '../ui/RatingGraph';
import StatTiles from '../ui/StatTiles';
import SectionHeader from './SectionHeader';
import { spacing } from '@/constants/theme';

interface RatingsSectionProps {
  ratings: number[];
  averageRating: number;
  reviewsCount: number;
  favouritesCount: number;
  savedCount: number;
  onPressReviews?: () => void;
  onPressFavourites?: () => void;
  onPressSaved?: () => void;
  /** Favourites and Saved are hidden when their counts are unavailable. */
  reviewsOnly?: boolean;
}

/** The Ratings block: a header carrying the mean score, the distribution strip,
 *  and the three dashboard tiles beneath it. */
export default function RatingsSection({
  ratings,
  averageRating,
  reviewsCount,
  favouritesCount,
  savedCount,
  onPressReviews,
  onPressFavourites,
  onPressSaved,
  reviewsOnly = false,
}: RatingsSectionProps) {
  return (
    <View style={styles.container}>
      <SectionHeader title="Ratings" action={<BeanScore rating={averageRating} />} />
      <RatingGraph ratings={ratings} averageRating={averageRating} />
      <StatTiles
        reviewsCount={reviewsCount}
        favouritesCount={favouritesCount}
        savedCount={savedCount}
        onPressReviews={onPressReviews}
        onPressFavourites={onPressFavourites}
        onPressSaved={onPressSaved}
        reviewsOnly={reviewsOnly}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
});
