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
import {
  SHARE_BEAN_HEIGHT,
  SHARE_BEAN_LEFT_D,
  SHARE_BEAN_RIGHT_D,
  SHARE_BEAN_WIDTH,
  shareSeedSvg,
} from '@/constants/shareIcons';
import { colors } from '@/constants/theme';

interface SwipeableBeanRatingProps {
  rating: number;
  onChange: (rating: number) => void;
  /** Fired when the finger lifts after a tap or a swipe. */
  onRelease?: () => void;
  /**
   * classic = the half-bean artwork used across the app (default).
   * share = the Share Review bean shape in Bean/Fill brown with solid Accent grey
   * empties, stretched to fill the row. Used by the review form.
   */
  variant?: 'classic' | 'share';
  /** classic only: bean height in pt. */
  size?: number;
  /** Gap between beans. */
  spacing?: number;
}

const BEAN_COUNT = 5;
const SHARE_ASPECT = SHARE_BEAN_HEIGHT / SHARE_BEAN_WIDTH;

const SHARE_SEEDS = {
  leftFilled: shareSeedSvg(SHARE_BEAN_LEFT_D, colors.beanFill),
  rightFilled: shareSeedSvg(SHARE_BEAN_RIGHT_D, colors.beanFill),
  leftEmpty: shareSeedSvg(SHARE_BEAN_LEFT_D, colors.accent),
  rightEmpty: shareSeedSvg(SHARE_BEAN_RIGHT_D, colors.accent),
};

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

/** Both seeds stacked in one box, as ShareBean does on the story card. A half
 *  rating fills only the left seed. */
function ShareBeanIcon({ width, fill }: { width: number; fill: Fill }) {
  const height = width * SHARE_ASPECT;
  return (
    <View style={{ width, height }}>
      <View style={StyleSheet.absoluteFill}>
        <SvgXml
          xml={fill === 'empty' ? SHARE_SEEDS.leftEmpty : SHARE_SEEDS.leftFilled}
          width={width}
          height={height}
        />
      </View>
      <View style={StyleSheet.absoluteFill}>
        <SvgXml
          xml={fill === 'full' ? SHARE_SEEDS.rightFilled : SHARE_SEEDS.rightEmpty}
          width={width}
          height={height}
        />
      </View>
    </View>
  );
}

export default function SwipeableBeanRating({
  rating,
  onChange,
  onRelease,
  variant = 'classic',
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

  const handleRelease = useCallback(() => {
    onRelease?.();
  }, [onRelease]);

  const tapGesture = Gesture.Tap()
    .maxDuration(400)
    .onEnd((event) => {
      runOnJS(applyRatingFromX)(event.x);
    })
    .onFinalize(() => {
      runOnJS(handleRelease)();
    });

  const panGesture = Gesture.Pan()
    .activeOffsetX([-2, 2])
    .onBegin((event) => {
      runOnJS(applyRatingFromX)(event.x);
    })
    .onUpdate((event) => {
      runOnJS(applyRatingFromX)(event.x);
    })
    .onFinalize(() => {
      runOnJS(handleRelease)();
    });

  const composed = Gesture.Simultaneous(tapGesture, panGesture);

  const shareBeanWidth =
    rowWidth > 0 ? (rowWidth - spacing * (BEAN_COUNT - 1)) / BEAN_COUNT : 0;

  return (
    <GestureDetector gesture={composed}>
      <View
        style={[
          styles.row,
          variant === 'share' ? styles.rowStretch : styles.rowClassic,
          { gap: spacing },
        ]}
        onLayout={handleLayout}
        collapsable={false}
      >
        {Array.from({ length: BEAN_COUNT }, (_, index) => {
          const beanIndex = index + 1;
          let fill: Fill = 'empty';
          if (rating >= beanIndex) fill = 'full';
          else if (rating >= beanIndex - 0.5) fill = 'half';
          if (variant === 'share') {
            return shareBeanWidth > 0 ? (
              <ShareBeanIcon key={beanIndex} width={shareBeanWidth} fill={fill} />
            ) : null;
          }
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
  },
  rowClassic: {
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  // Fills its parent's width; the parent decides how wide the bean row is.
  rowStretch: {
    width: '100%',
  },
  bean: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
