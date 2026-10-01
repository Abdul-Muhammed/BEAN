import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import SectionHeader from './SectionHeader';
import DiaryList from './DiaryList';
import { ARROW_RIGHT_SM_SVG } from '@/constants/figmaIcons';
import { UserReview } from '../../data/mockData';
import { colors, spacing, type } from '@/constants/theme';

interface RecentActivitySectionProps {
  reviews: UserReview[];
  isFavorited: (cafeId: string) => boolean;
  onPressEntry: (reviewId: string) => void;
  onPressViewAll?: () => void;
}

/** The most recent diary entries, using the same compact row as the Diary tab.
 *  The header is inset but the rows run full width, as the frame draws them. */
export default function RecentActivitySection({
  reviews,
  isFavorited,
  onPressEntry,
  onPressViewAll,
}: RecentActivitySectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SectionHeader
          title="Recent Activity"
          action={<SvgXml xml={ARROW_RIGHT_SM_SVG} width={16} height={16} />}
          onPressAction={onPressViewAll}
          accessibilityLabel="See the full diary"
        />
      </View>

      {reviews.length === 0 ? (
        <View style={styles.empty}>
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
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  header: {
    paddingHorizontal: spacing.md,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  emptyTitle: {
    ...type.title1,
    color: colors.ink,
  },
  emptySubtitle: {
    ...type.body1,
    lineHeight: 18,
    color: colors.greyNormal,
    textAlign: 'center',
  },
});
