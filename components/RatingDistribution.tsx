import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { Review } from '../data/mockData';

interface RatingDistributionProps {
  reviews: Review[];
  averageRating?: number;
}

export default function RatingDistribution({ reviews, averageRating }: RatingDistributionProps) {
  // Calculate average rating if not provided
  const avgRating = averageRating || useMemo(() => {
    if (reviews.length === 0) return 4.0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / reviews.length;
  }, [reviews]);

  const totalReviews = reviews.length || 40; // Default to 40 if no reviews

  // Generate bell curve distribution based on average rating
  // Using normal distribution formula centered around average rating
  const generateBellCurve = (mean: number, total: number): number[] => {
    const stdDev = 1.0; // Standard deviation for the bell curve
    const ratings = [1, 2, 3, 4, 5];
    
    // Calculate probability density for each rating
    const probabilities = ratings.map(rating => {
      const exponent = -0.5 * Math.pow((rating - mean) / stdDev, 2);
      return Math.exp(exponent);
    });
    
    // Normalize probabilities to sum to 1
    const sumProb = probabilities.reduce((a, b) => a + b, 0);
    const normalized = probabilities.map(p => p / sumProb);
    
    // Convert probabilities to counts
    const counts = normalized.map(p => Math.round(p * total));
    
    // Adjust to ensure total matches exactly
    const currentTotal = counts.reduce((a, b) => a + b, 0);
    const diff = total - currentTotal;
    if (diff !== 0) {
      // Add/subtract from the peak (closest to mean)
      const peakIndex = ratings.reduce((best, rating, idx) => 
        Math.abs(rating - mean) < Math.abs(ratings[best] - mean) ? idx : best, 0
      );
      counts[peakIndex] += diff;
    }
    
    return counts;
  };

  // Generate distribution as bell curve based on average rating
  // This creates a realistic bell curve distribution centered around the average
  const distribution = useMemo(() => {
    // Always generate bell curve based on average rating for consistent visualization
    return generateBellCurve(avgRating, totalReviews);
  }, [avgRating, totalReviews]);

  const maxCount = Math.max(...distribution, 1); // Avoid division by zero
  const maxBarHeight = 60; // Maximum height in pixels

  return (
    <View style={styles.container}>
      {/* Vertical bars arranged horizontally: 1 star (left) to 5 stars (right) */}
      <View style={styles.barsContainer}>
        {distribution.map((count, index) => {
          const starRating = index + 1; // 1, 2, 3, 4, 5 (left to right)
          const barHeight = totalReviews > 0 ? (count / maxCount) * maxBarHeight : 0;
          const isEndBar = starRating === 1 || starRating === 5; // Show star only at ends
          
          return (
            <View key={starRating} style={styles.barColumn}>
              <View style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { height: Math.max(barHeight, 4) } // Minimum height of 4px
                  ]} 
                />
              </View>
              {/* Only show star indicators at 1-star (left) and 5-star (right) positions */}
              {isEndBar && (
                <View style={styles.starContainer}>
                  <Star 
                    size={12} 
                    color="#4CAF50" 
                    fill="#4CAF50" 
                  />
                </View>
              )}
            </View>
          );
        })}
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
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 80,
    gap: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    minHeight: 80,
  },
  barContainer: {
    width: '100%',
    height: 60,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 4,
    minHeight: 4,
  },
  starContainer: {
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

