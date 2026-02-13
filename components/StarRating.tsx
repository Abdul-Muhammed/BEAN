import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';

interface StarRatingProps {
  rating: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

export default function StarRating({ 
  rating, 
  size = 16, 
  interactive = false, 
  onRatingChange 
}: StarRatingProps) {
  const handleStarPress = (starRating: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= rating;
        
        if (interactive) {
          return (
            <TouchableOpacity
              key={star}
              onPress={() => handleStarPress(star)}
              style={styles.starButton}
            >
              <Star
                size={size}
                color={isFilled ? '#D4A574' : '#E5E5E5'}
                fill={isFilled ? '#D4A574' : 'transparent'}
              />
            </TouchableOpacity>
          );
        }

        return (
          <Star
            key={star}
            size={size}
            color={isFilled ? '#D4A574' : '#E5E5E5'}
            fill={isFilled ? '#D4A574' : 'transparent'}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starButton: {
    padding: 2,
  },
});