import React, { useEffect } from 'react';
import { Animated, StyleSheet, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';

// One pulse shared by every mounted Skeleton, so blocks across a screen breathe
// in step rather than drifting apart. The loop runs only while any are mounted.
const pulse = new Animated.Value(0);
const loop = Animated.loop(
  Animated.sequence([
    Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
    Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
  ])
);
let mounted = 0;
const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** A pulsing placeholder block for content that is still loading. */
export default function Skeleton({ width = '100%', height = 12, radius = 6, style }: SkeletonProps) {
  useEffect(() => {
    mounted += 1;
    if (mounted === 1) {
      pulse.setValue(0);
      loop.reset();
      loop.start();
    }
    return () => {
      mounted -= 1;
      if (mounted === 0) loop.stop();
    };
  }, []);

  return (
    <Animated.View
      accessible={false}
      style={[styles.block, { width, height, borderRadius: radius, opacity }, style]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.disabled,
  },
});
