import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SvgXml } from 'react-native-svg';
import {
  BEAN_LEFT_SVG,
  BEAN_RIGHT_SVG,
  BEAN_HALF_RATIO,
  BEAN_EMPTY_OPACITY,
} from '@/constants/beans';

interface SwipeableBeanRatingProps {
  rating: number;
  onChange: (rating: number) => void;
  size?: number;
  spacing?: number;
}

const BEAN_COUNT = 5;

function clampToHalfStep(raw: number) {
  const stepped = Math.round(raw * 2) / 2;
  if (stepped < 0.5) return 0.5;
  if (stepped > BEAN_COUNT) return BEAN_COUNT;
  return stepped;
}

type Fill = 'empty' | 'half' | 'full';

function BeanIcon({ size, fill }: { size: number; fill: Fill }) {
  const halfWidth = size * BEAN_HALF_RATIO;
  const leftOpacity = fill === 'empty' ? BEAN_EMPTY_OPACITY : 1;
  const rightOpacity = fill === 'full' ? 1 : BEAN_EMPTY_OPACITY;
  return (
    <View style={styles.bean}>
      <View style={{ opacity: leftOpacity }}>
        <SvgXml xml={BEAN_LEFT_SVG} width={halfWidth} height={size} />
      </View>
      <View style={{ opacity: rightOpacity }}>
        <SvgXml xml={BEAN_RIGHT_SVG} width={halfWidth} height={size} />
      </View>
    </View>
  );
}

export default function SwipeableBeanRating({
  rating,
  onChange,
  size = 42,
  spacing = 6,
}: SwipeableBeanRatingProps) {
  const [rowWidth, setRowWidth] = useState(0);
  const lastReportedRef = useRef<number>(rating);

  const handleLayout = (event: LayoutChangeEvent) => {
    setRowWidth(event.nativeEvent.layout.width);
  };

  const applyRatingFromX = useCallback(
    (x: number) => {
      if (rowWidth <= 0) return;
      const clampedX = Math.max(0, Math.min(rowWidth, x));
      const raw = (clampedX / rowWidth) * BEAN_COUNT;
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
        {Array.from({ length: BEAN_COUNT }, (_, index) => {
          const beanIndex = index + 1;
          let fill: Fill = 'empty';
          if (rating >= beanIndex) fill = 'full';
          else if (rating >= beanIndex - 0.5) fill = 'half';
          return <BeanIcon key={beanIndex} size={size} fill={fill} />;
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
  bean: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
