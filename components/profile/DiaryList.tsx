import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Heart } from 'lucide-react-native';
import BeanRating from '../BeanRating';
import BeanLogo from '../BeanLogo';
import { UserReview } from '../../data/mockData';
import {
  MONTH_ABBR,
  getReviewVisitDate,
  groupReviewsByYear,
} from '../../utils/reviewDates';
import { colors } from '@/constants/theme';

interface DiaryListProps {
  reviews: UserReview[];
  isFavorited: (cafeId: string) => boolean;
  onPressEntry: (reviewId: string) => void;
  /** Group entries under year headers (Diary tab). When false, render a flat
   *  list of cards (Recent Activity). Defaults to true. */
  grouped?: boolean;
}

function DiaryCard({
  review,
  isFav,
  onPress,
}: {
  review: UserReview;
  isFav: boolean;
  onPress: () => void;
}) {
  const visitDate = getReviewVisitDate(review);
  const dayNumber = visitDate
    ? String(visitDate.day)
    : review.date.match(/\d+/)?.[0] || review.date;
  const monthName = visitDate
    ? visitDate.month
    : review.date.match(/[A-Za-z]+/)?.[0] || '';
  const monthAbbr = MONTH_ABBR[monthName] || monthName.slice(0, 3).toUpperCase();

  return (
    <TouchableOpacity style={styles.diaryCard} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.diaryDateBlock}>
        <Text style={styles.diaryDateDay}>{dayNumber}</Text>
        <Text style={styles.diaryDateMonth}>{monthAbbr}</Text>
      </View>

      {review.cafeImage ? (
        <Image source={{ uri: review.cafeImage }} style={styles.diaryThumb} />
      ) : (
        <View style={[styles.diaryThumb, styles.diaryThumbFallback]}>
          <BeanLogo width={20} height={34} color="#FFFFFF" />
        </View>
      )}

      <View style={styles.diaryCardBody}>
        <View style={styles.diaryCardTitleRow}>
          <Text style={styles.diaryCardName} numberOfLines={1}>
            {review.cafeName}
          </Text>
          {isFav && <Heart size={14} color="#FF3B30" fill="#FF3B30" />}
        </View>
        <View style={styles.diaryCardRatingRow}>
          <BeanRating rating={review.rating} size={14} />
          <Text style={styles.diaryCardRatingText}>{review.rating.toFixed(1)}</Text>
        </View>
        {review.orderedItem ? (
          <Text style={styles.diaryCardOrderText} numberOfLines={1}>
            Ordered: {review.orderedItem}
          </Text>
        ) : null}
        {review.text ? (
          <Text style={styles.diaryCardNotesText} numberOfLines={2}>
            {review.text}
          </Text>
        ) : null}
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
      <View style={styles.flatList}>
        {reviews.map((review) => (
          <DiaryCard
            key={review.id}
            review={review}
            isFav={isFavorited(review.cafeId)}
            onPress={() => onPressEntry(review.id)}
          />
        ))}
      </View>
    );
  }

  const groups = groupReviewsByYear(reviews);

  return (
    <View>
      {groups.map((group) => (
        <View key={group.year} style={styles.yearSection}>
          <View style={styles.yearHeaderRow}>
            <Text style={styles.yearHeader}>{group.year}</Text>
            <View style={styles.yearHeaderLine} />
            <Text style={styles.yearCount}>
              {group.reviews.length} {group.reviews.length === 1 ? 'visit' : 'visits'}
            </Text>
          </View>
          {group.reviews.map((review) => (
            <DiaryCard
              key={review.id}
              review={review}
              isFav={isFavorited(review.cafeId)}
              onPress={() => onPressEntry(review.id)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flatList: {
    gap: 10,
  },
  yearSection: {
    marginBottom: 24,
  },
  yearHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  yearHeader: {
    fontSize: 18,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
  },
  yearHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  yearCount: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  diaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  diaryDateBlock: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    paddingTop: 4,
  },
  diaryDateDay: {
    fontSize: 22,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
    lineHeight: 26,
  },
  diaryDateMonth: {
    fontSize: 11,
    fontFamily: 'Lato-Bold',
    color: '#D4AF37',
    letterSpacing: 1,
    marginTop: 2,
  },
  diaryThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    marginRight: 12,
  },
  diaryThumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
  },
  diaryCardBody: {
    flex: 1,
  },
  diaryCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  diaryCardName: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
  diaryCardRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  diaryCardRatingText: {
    fontSize: 13,
    fontFamily: 'Lato-Bold',
    color: '#4CAF50',
  },
  diaryCardOrderText: {
    fontSize: 13,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
    marginBottom: 3,
  },
  diaryCardNotesText: {
    fontSize: 13,
    fontFamily: 'Lato-Regular',
    color: '#6B6257',
    lineHeight: 18,
  },
});
