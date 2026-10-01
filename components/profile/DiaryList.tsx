import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SvgXml } from 'react-native-svg';
import BeanRating from '../BeanRating';
import { HEART_12_FILLED_SVG } from '@/constants/figmaIcons';
import { UserReview } from '../../data/mockData';
import { getReviewVisitDate, groupReviewsByMonth } from '../../utils/reviewDates';
import { colors, radius, spacing, type } from '@/constants/theme';

interface DiaryListProps {
  reviews: UserReview[];
  isFavorited: (cafeId: string) => boolean;
  onPressEntry: (reviewId: string) => void;
  /** Group entries under cream month bands (Diary tab). When false, render a
   *  flat run of rows (Recent Activity). Defaults to true. */
  grouped?: boolean;
}

/**
 * One diary entry: a bordered day box, the cafe name, then the bean spread and
 * a heart when the cafe is favourited.
 *
 * Deliberately lean. Notes, the ordered item and the numeric score used to live
 * here but the design moves them to the review detail screen, one tap away, so
 * the diary reads as a dense log rather than a feed.
 */
export function DiaryRow({
  review,
  isFav,
  onPress,
  isLast = false,
}: {
  review: UserReview;
  isFav: boolean;
  onPress: () => void;
  isLast?: boolean;
}) {
  const visitDate = getReviewVisitDate(review);
  const dayNumber = visitDate
    ? String(visitDate.day)
    : review.date.match(/\d+/)?.[0] || '';

  return (
    <TouchableOpacity
      style={[styles.row, !isLast && styles.rowDivided]}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${review.cafeName}, rated ${review.rating} out of 5`}
    >
      <View style={styles.dayBox}>
        <Text style={styles.dayText}>{dayNumber}</Text>
      </View>

      <Text style={styles.name} numberOfLines={1}>
        {review.cafeName}
      </Text>

      <View style={styles.ratingRow}>
        <BeanRating rating={review.rating} size={12} />
        {isFav && <SvgXml xml={HEART_12_FILLED_SVG} width={12} height={12} />}
      </View>
    </TouchableOpacity>
  );
}

export default function DiaryList({
  reviews,
  isFavorited,
  onPressEntry,
  grouped = true,
}: DiaryListProps) {
  if (!grouped) {
    return (
      <View>
        {reviews.map((review, index) => (
          <DiaryRow
            key={review.id}
            review={review}
            isFav={isFavorited(review.cafeId)}
            onPress={() => onPressEntry(review.id)}
            isLast={index === reviews.length - 1}
          />
        ))}
      </View>
    );
  }

  return (
    <View>
      {groupReviewsByMonth(reviews).map((group) => (
        <View key={group.key}>
          <View style={styles.monthBand}>
            <Text style={styles.monthText}>{group.label}</Text>
          </View>
          {group.reviews.map((review, index) => (
            <DiaryRow
              key={review.id}
              review={review}
              isFav={isFavorited(review.cafeId)}
              onPress={() => onPressEntry(review.id)}
              isLast={index === group.reviews.length - 1}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  monthBand: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cream,
  },
  monthText: {
    ...type.footnote1,
    color: colors.ink,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  rowDivided: {
    borderBottomWidth: 1,
    borderBottomColor: colors.cream,
  },
  dayBox: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent2,
  },
  dayText: {
    ...type.body1,
    color: colors.slate,
  },
  name: {
    ...type.title1,
    flex: 1,
    color: colors.ink,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
});
