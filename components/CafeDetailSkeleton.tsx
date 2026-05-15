import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '@/constants/theme';

export default function CafeDetailSkeleton() {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.imageSkeleton, { opacity }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Animated.View style={[styles.nameSkeleton, { opacity }]} />
          <Animated.View style={[styles.locationSkeleton, { opacity }]} />
          <Animated.View style={[styles.ratingSkeleton, { opacity }]} />
        </View>

        <View style={styles.descriptionContainer}>
          <Animated.View style={[styles.descriptionLine, { opacity }]} />
          <Animated.View style={[styles.descriptionLine, { opacity }]} />
          <Animated.View style={[styles.descriptionLineShort, { opacity }]} />
        </View>

        <View style={styles.reviewsSection}>
          <Animated.View style={[styles.sectionTitleSkeleton, { opacity }]} />
          <Animated.View style={[styles.reviewCardSkeleton, { opacity }]} />
          <Animated.View style={[styles.reviewCardSkeleton, { opacity }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  imageSkeleton: {
    width: '100%',
    height: 300,
    backgroundColor: '#E5E5EA',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  nameSkeleton: {
    width: '70%',
    height: 32,
    backgroundColor: '#E5E5EA',
    borderRadius: 8,
    marginBottom: 8,
  },
  locationSkeleton: {
    width: '50%',
    height: 20,
    backgroundColor: '#E5E5EA',
    borderRadius: 6,
    marginBottom: 12,
  },
  ratingSkeleton: {
    width: 120,
    height: 24,
    backgroundColor: '#E5E5EA',
    borderRadius: 6,
  },
  descriptionContainer: {
    marginBottom: 32,
  },
  descriptionLine: {
    width: '100%',
    height: 16,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    marginBottom: 8,
  },
  descriptionLineShort: {
    width: '60%',
    height: 16,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
  },
  reviewsSection: {
    marginBottom: 100,
  },
  sectionTitleSkeleton: {
    width: 100,
    height: 24,
    backgroundColor: '#E5E5EA',
    borderRadius: 6,
    marginBottom: 16,
  },
  reviewCardSkeleton: {
    width: '100%',
    height: 120,
    backgroundColor: '#E5E5EA',
    borderRadius: 12,
    marginBottom: 16,
  },
});
