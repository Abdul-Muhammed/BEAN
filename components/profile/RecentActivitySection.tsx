import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArrowRight, Coffee } from 'lucide-react-native';
import SectionHeader from './SectionHeader';
import DiaryList from './DiaryList';
import { UserReview } from '../../data/mockData';
import { colors } from '@/constants/theme';

interface RecentActivitySectionProps {
  reviews: UserReview[];
  isFavorited: (cafeId: string) => boolean;
  onPressEntry: (reviewId: string) => void;
  onPressViewAll?: () => void;
}

/** Recent diary entries, reusing the Diary tab's card design (flat, ungrouped). */
export default function RecentActivitySection({
  reviews,
  isFavorited,
  onPressEntry,
  onPressViewAll,
}: RecentActivitySectionProps) {
  return (
    <View style={styles.container}>
      <SectionHeader
        title="Recent Activity"
        action={<ArrowRight size={20} color="#8E8E93" />}
        onPressAction={onPressViewAll}
      />
      {reviews.length === 0 ? (
        <View style={styles.empty}>
          <Coffee size={32} color="#8E8E93" />
          <Text style={styles.emptyTitle}>No reviews yet</Text>
          <Text style={styles.emptySubtitle}>
            Your coffee opinions are still steeping. Go find a cafe and spill the beans.
          </Text>
        </View>
      ) : (
        <DiaryList
          reviews={reviews}
          isFavorited={isFavorited}
          onPressEntry={onPressEntry}
          grouped={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  empty: {
    padding: 24,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
});
