import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Star } from 'lucide-react-native';
import { colors } from '@/constants/theme';

interface SwipeableStarRatingProps {
  rating: number;
  onChange: (rating: number) => void;
  size?: number;
  spacing?: number;
}

const STAR_COUNT = 5;

function clampToHalfStep(raw: number) {
  const stepped = Math.round(raw * 2) / 2;
  if (stepped < 0.5) return 0.5;
  if (stepped > STAR_COUNT) return STAR_COUNT;
  return stepped;
}

interface StarIconProps {
  size: number;
  fill: 'empty' | 'half' | 'full';
}

function StarIcon({ size, fill }: StarIconProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Star
        size={size}
        color={fill === 'empty' ? colors.disabled : colors.gold}
        fill="transparent"
        strokeWidth={2}
      />
      {fill !== 'empty' && (
        <View
          style={[
            styles.fillOverlay,
            { width: fill === 'full' ? size : size / 2, height: size },
          ]}
          pointerEvents="none"
        >
          <Star
            size={size}
            color={colors.gold}
            fill={colors.gold}
            strokeWidth={2}
          />
        </View>
      )}
    </View>
  );
}

export default function SwipeableStarRating({
  rating,
  onChange,
  size = 42,
  spacing = 6,
}: SwipeableStarRatingProps) {
  const [rowWidth, setRowWidth] = useState(0);
  const lastReportedRef = useRef<number>(rating);

  const handleLayout = (event: LayoutChangeEvent) => {
    setRowWidth(event.nativeEvent.layout.width);
  };

  const applyRatingFromX = useCallback(
    (x: number) => {
      if (rowWidth <= 0) return;
      const clampedX = Math.max(0, Math.min(rowWidth, x));
      const raw = (clampedX / rowWidth) * STAR_COUNT;
      const next = clampToHalfStep(raw);
      if (next !== lastReportedRef.current) {
        lastReportedRef.current = next;
        try {
          Haptics.selectionAsync();
        } catch {
        }
        onChange(next);
      }
    },
    [rowWidth, onChange]
  );

  const tapGesture = Gesture.Tap()
    .maxDuration(400)
    .onEnd((event) => {
      runOnJS(applyRatingFromX)(event.x);
    });

  const panGesture = Gesture.Pan()
    .activeOffsetX([-2, 2])
    .onBegin((event) => {
      runOnJS(applyRatingFromX)(event.x);
    })
    .onUpdate((event) => {
      runOnJS(applyRatingFromX)(event.x);
    });

  const composed = Gesture.Simultaneous(tapGesture, panGesture);

  return (
    <GestureDetector gesture={composed}>
      <View
        style={[styles.row, { gap: spacing }]}
        onLayout={handleLayout}
        collapsable={false}
      >
        {Array.from({ length: STAR_COUNT }, (_, index) => {
          const starIndex = index + 1;
          let fill: 'empty' | 'half' | 'full' = 'empty';
          if (rating >= starIndex) fill = 'full';
          else if (rating >= starIndex - 0.5) fill = 'half';
          return <StarIcon key={starIndex} size={size} fill={fill} />;
        })}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  fillOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
});
