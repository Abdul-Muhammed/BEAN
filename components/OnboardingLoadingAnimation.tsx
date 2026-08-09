import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  beanFillSvg,
  BEAN_GREY,
  BEAN_DARK,
  BEAN_VIEWBOX_WIDTH,
  BEAN_VIEWBOX_HEIGHT,
} from '../constants/loadingAnimationIcons';

const ASPECT = BEAN_VIEWBOX_WIDTH / BEAN_VIEWBOX_HEIGHT;
const DEFAULT_HEIGHT = 184;

// Frame2's canvas is cropped to 103/189 of the full width, so pausing the wipe
// at this fraction lands exactly on the supplied middle frame.
const FRAME2_FRACTION = 103 / BEAN_VIEWBOX_WIDTH;

const FILL_TO_FRAME2_MS = 700;
const FILL_TO_FULL_MS = 700;
const HOLD_MS = 600;
const RESET_FADE_MS = 250;

interface OnboardingLoadingAnimationProps {
  /** Height in px; width is derived so the mark keeps its aspect ratio. */
  height?: number;
  /** Repeat the wipe until unmounted. Defaults to true. */
  loop?: boolean;
  /** Fires on the JS thread at the end of every hold. */
  onCycleComplete?: () => void;
}

/**
 * The bean mark filling with colour from left to right — grey (#ADAFA4) washing
 * to near-black (#0F1312), passing through the supplied Frame2 state on the way.
 *
 * Implemented as two stacked layers rather than a crossfade: a grey base, and a
 * dark copy inside a clipping view whose *width* animates from 0 to full. The
 * dark copy is pinned at a fixed width so the clip reveals it rather than
 * squashing it, which is what produces a true wipe.
 *
 * Driven by Reanimated on plain RN layout — no react-native-svg prop animation,
 * which is the unreliable path under the New Architecture. Both layers are
 * absolutely positioned inside a fixed-size box, so the logo cannot move,
 * resize, or shift the content around it at any point in the cycle.
 */
function OnboardingLoadingAnimation({
  height = DEFAULT_HEIGHT,
  loop = true,
  onCycleComplete,
}: OnboardingLoadingAnimationProps) {
  const width = Math.round(height * ASPECT);

  const greyXml = useMemo(() => beanFillSvg(BEAN_GREY), []);
  const darkXml = useMemo(() => beanFillSvg(BEAN_DARK), []);

  // Fraction of the mark that has been filled, 0..1.
  const progress = useSharedValue(0);
  // Fades the dark layer out between loops so the reset never reads as a cut.
  const overlayOpacity = useSharedValue(1);

  // Held in a ref so an inline callback from the parent can't retrigger the
  // effect and restart the wipe mid-cycle.
  const onCycleCompleteRef = useRef(onCycleComplete);
  useEffect(() => {
    onCycleCompleteRef.current = onCycleComplete;
  }, [onCycleComplete]);

  useEffect(() => {
    const onDone = () => {
      onCycleCompleteRef.current?.();
    };

    const runCycle = () => {
      progress.value = 0;
      overlayOpacity.value = 1;

      progress.value = withSequence(
        withTiming(FRAME2_FRACTION, {
          duration: FILL_TO_FRAME2_MS,
          easing: Easing.inOut(Easing.cubic),
        }),
        withTiming(1, {
          duration: FILL_TO_FULL_MS,
          easing: Easing.inOut(Easing.cubic),
        }),
        // Hold the finished state, then report the cycle. The 1ms timing is a
        // no-op that guarantees a frame for the callback to fire on.
        withDelay(
          HOLD_MS,
          withTiming(1, { duration: 1 }, (finished) => {
            if (!finished) return;
            runOnJS(onDone)();
            if (loop) runOnJS(runCycle)();
          })
        )
      );

      if (loop) {
        // Fade the fill away as the cycle ends so the next wipe starts clean.
        overlayOpacity.value = withDelay(
          FILL_TO_FRAME2_MS + FILL_TO_FULL_MS + HOLD_MS,
          withTiming(0, { duration: RESET_FADE_MS, easing: Easing.out(Easing.quad) })
        );
      }
    };

    runCycle();

    return () => {
      cancelAnimation(progress);
      cancelAnimation(overlayOpacity);
    };
  }, [loop, progress, overlayOpacity]);

  const clipStyle = useAnimatedStyle(() => ({
    width: progress.value * width,
    opacity: overlayOpacity.value,
  }));

  return (
    <View style={[styles.container, { width, height }]}>
      <SvgXml xml={greyXml} width={width} height={height} />

      <Animated.View style={[styles.clip, { height }, clipStyle]}>
        {/* Fixed width so the clip reveals the mark instead of scaling it. */}
        <View style={{ width, height }}>
          <SvgXml xml={darkXml} width={width} height={height} />
        </View>
      </Animated.View>
    </View>
  );
}

export default React.memo(OnboardingLoadingAnimation);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  clip: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
});
