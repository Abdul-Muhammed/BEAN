import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { UserReview } from '../data/mockData';

interface HorizontalRatingDistributionProps {
  reviews: UserReview[];
}

export default function HorizontalRatingDistribution({ reviews }: HorizontalRatingDistributionProps) {
  // Calculate distribution from actual reviews
  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // 1-star to 5-star
    reviews.forEach(review => {
      const rating = Math.round(review.rating);
      if (rating >= 1 && rating <= 5) {
        counts[rating - 1]++;
      }
    });
    return counts;
  }, [reviews]);

  const maxCount = Math.max(...distribution, 1);
  const maxBarWidth = 200; // Maximum width in pixels

  return (
    <View style={styles.container}>
      <View style={styles.barsContainer}>
        {distribution.map((count, index) => {
          const starRating = index + 1; // 1, 2, 3, 4, 5
          const barWidth = maxCount > 0 ? (count / maxCount) * maxBarWidth : 0;
          const isEndBar = starRating === 1 || starRating === 5;
          
          return (
            <View key={starRating} style={styles.barRow}>
              {/* Star indicator at ends */}
              {isEndBar && (
                <View style={styles.starContainer}>
                  <Star 
                    size={14} 
                    color="#4CAF50" 
                    fill="#4CAF50" 
                  />
                </View>
              )}
              {!isEndBar && <View style={styles.starPlaceholder} />}
              
              {/* Bar */}
              <View style={styles.barWrapper}>
                <View 
                  style={[
                    styles.bar, 
                    { width: Math.max(barWidth, 4) } // Minimum width of 4px
                  ]} 
                />
              </View>
            </View>
          );
        })}
      </View>
      {/* Labels for 1-star (left) and 5-star (right) */}
      <View style={styles.labelsContainer}>
        <Text style={styles.labelText}>1</Text>
        <View style={styles.labelSpacer} />
        <Text style={styles.labelText}>5</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 4,
  },
  barRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starContainer: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starPlaceholder: {
    width: 14,
    height: 14,
  },
  barWrapper: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  bar: {
    height: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 4,
    minWidth: 4,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  labelSpacer: {
    flex: 1,
  },
  labelText: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
});

