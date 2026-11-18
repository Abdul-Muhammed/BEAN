import { useEffect, useRef } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewInstance,
} from 'react-native';

/**
 * Keeps a tabbed profile from opening a tab part-way down.
 *
 * The profile is one ScrollView: a hero, then sticky tabs, then the active
 * tab's content. Without this, scrolling to the bottom of Overview and then
 * switching to Diary keeps the old offset, so the diary opens on older
 * entries. On every tab change, if the page is scrolled past the tabs, it
 * jumps back so the tabs sit at the top and the new tab starts at its first
 * (newest) entry. If the tabs are still below the top, nothing moves.
 *
 * Spread `scrollProps` and `ref={scrollRef}` on the ScrollView, and put
 * `onLayout={onHeroLayout}` on the view directly above the tabs.
 */
export function useTabScrollReset(activeTab: string) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollY = useRef(0);
  const tabsY = useRef(0);

  useEffect(() => {
    if (scrollY.current > tabsY.current) {
      scrollRef.current?.scrollTo({ y: tabsY.current, animated: false });
    }
  }, [activeTab]);

  const onHeroLayout = (e: LayoutChangeEvent) => {
    tabsY.current = e.nativeEvent.layout.height;
  };

  const scrollProps = {
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.current = e.nativeEvent.contentOffset.y;
    },
    scrollEventThrottle: 16,
  };

  return { scrollRef, scrollProps, onHeroLayout };
}
