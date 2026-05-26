import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';

interface StarRatingProps {
  rating: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

const FULL_COLOR = '#D4A574';
const EMPTY_COLOR = '#E5E5E5';

interface StarCellProps {
  size: number;
  fill: 'empty' | 'half' | 'full';
}

function StarCell({ size, fill }: StarCellProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Star
        size={size}
        color={fill === 'empty' ? EMPTY_COLOR : FULL_COLOR}
        fill={fill === 'full' ? FULL_COLOR : 'transparent'}
      />
      {fill === 'half' && (
        <View
          style={[styles.halfOverlay, { width: size / 2, height: size }]}
          pointerEvents="none"
        >
          <Star size={size} color={FULL_COLOR} fill={FULL_COLOR} />
        </View>
      )}
    </View>
  );
}

function getFill(starIndex: number, rating: number): 'empty' | 'half' | 'full' {
  if (rating >= starIndex) return 'full';
  if (rating >= starIndex - 0.5) return 'half';
  return 'empty';
}

export default function StarRating({
  rating,
  size = 16,
  interactive = false,
  onRatingChange,
}: StarRatingProps) {
  const handleStarPress = (starRating: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = getFill(star, rating);

        if (interactive) {
          return (
            <TouchableOpacity
              key={star}
              onPress={() => handleStarPress(star)}
              style={styles.starButton}
            >
              <StarCell size={size} fill={fill} />
            </TouchableOpacity>
          );
        }

        return <StarCell key={star} size={size} fill={fill} />;
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
  halfOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
});
