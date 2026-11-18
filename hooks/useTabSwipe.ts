import { useMemo, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { FadeInLeft, FadeInRight, runOnJS } from 'react-native-reanimated';

/** How far, or how fast, a horizontal swipe has to travel to switch tabs. */
const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 500;
const ENTER_MS = 220;

/**
 * Horizontal swipe between ordered tabs (the profile's Overview and Diary).
 *
 * The pan only activates once the finger has moved 20pt sideways, and fails as
 * soon as it moves 12pt vertically, so the surrounding ScrollView keeps
 * vertical scrolling. Content doesn't track the finger; instead, the new tab
 * slides in from the side it was swiped from (or tapped toward).
 *
 * Wrap the tab content in `<GestureDetector gesture={gesture}>` and give its
 * Animated.View `key={activeTab}` and `entering={entering}`.
 */
export function useTabSwipe<T extends string>(
  tabs: readonly T[],
  activeTab: T,
  onChange: (tab: T) => void
) {
  const index = tabs.indexOf(activeTab);

  // Remember the last tab to pick which side the new content enters from
  // (React's "adjust state during render" pattern). The first render shows the
  // opening tab without an animation.
  const [prevIndex, setPrevIndex] = useState(index);
  const [direction, setDirection] = useState<'right' | 'left' | null>(null);
  if (prevIndex !== index) {
    setPrevIndex(index);
    setDirection(index > prevIndex ? 'right' : 'left');
  }

  const gesture = useMemo(() => {
    const goTo = (next: number) => {
      if (next >= 0 && next < tabs.length) onChange(tabs[next]);
    };
    return Gesture.Pan()
      .activeOffsetX([-20, 20])
      .failOffsetY([-12, 12])
      .onEnd((e) => {
        const swipedLeft = e.translationX < -SWIPE_DISTANCE || e.velocityX < -SWIPE_VELOCITY;
        const swipedRight = e.translationX > SWIPE_DISTANCE || e.velocityX > SWIPE_VELOCITY;
        // Swiping left reveals the next tab (to the right), like a pager.
        if (swipedLeft) runOnJS(goTo)(index + 1);
        else if (swipedRight) runOnJS(goTo)(index - 1);
      });
  }, [tabs, index, onChange]);

  const entering =
    direction === null
      ? undefined
      : (direction === 'right' ? FadeInRight : FadeInLeft).duration(ENTER_MS);

  return { gesture, entering };
}
