import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Pencil } from 'lucide-react-native';
import BeanRating from '../BeanRating';
import BeanLogo from '../BeanLogo';
import SectionHeader from './SectionHeader';
import { UserReview } from '../../data/mockData';
import { colors } from '@/constants/theme';

interface TopCafesSectionProps {
  reviews: UserReview[];
  onPressCafe?: (review: UserReview) => void;
  onPressEdit?: () => void;
}

interface TopCafe {
  cafeId: string;
  cafeName: string;
  cafeImage: string;
  rating: number;
}

/** Derive the user's 3 highest-rated cafes from their reviews (deduped by cafe,
 *  keeping the best rating per cafe). There's no hand-picked "top cafes" model
 *  yet, so this is computed. */
function deriveTopCafes(reviews: UserReview[]): TopCafe[] {
  const byCafe = new Map<string, TopCafe>();
  for (const r of reviews) {
    const existing = byCafe.get(r.cafeId);
    if (!existing || r.rating > existing.rating) {
      byCafe.set(r.cafeId, {
        cafeId: r.cafeId,
        cafeName: r.cafeName,
        cafeImage: r.cafeImage,
        rating: r.rating,
      });
    }
  }
  return Array.from(byCafe.values())
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);
}

export default function TopCafesSection({
  reviews,
  onPressCafe,
  onPressEdit,
}: TopCafesSectionProps) {
  const topCafes = useMemo(() => deriveTopCafes(reviews), [reviews]);

  if (topCafes.length === 0) return null;

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Top Cafes"
        action={<Pencil size={18} color="#8E8E93" />}
        onPressAction={onPressEdit}
      />
      <View style={styles.grid}>
        {topCafes.map((cafe) => {
          const original = reviews.find((r) => r.cafeId === cafe.cafeId);
          return (
            <TouchableOpacity
              key={cafe.cafeId}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => original && onPressCafe?.(original)}
            >
              {cafe.cafeImage ? (
                <Image source={{ uri: cafe.cafeImage }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.coverFallback]}>
                  <BeanLogo width={22} height={38} color="#FFFFFF" />
                </View>
              )}
              <Text style={styles.name} numberOfLines={1}>
                {cafe.cafeName}
              </Text>
              <BeanRating rating={cafe.rating} size={11} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 8,
  },
  cover: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    marginBottom: 8,
  },
  coverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
  },
  name: {
    fontSize: 13,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
    marginBottom: 6,
  },
});
