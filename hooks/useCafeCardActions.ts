import { useCallback } from 'react';
import { Keyboard } from 'react-native';
import { router } from 'expo-router';
import { useReviews } from '../context/ReviewContext';
import type { Cafe } from '../data/mockData';

/**
 * The default tap and save behaviour for a CafeListCard, shared by every screen
 * that lists cafes so a card does the same thing wherever it appears.
 *
 * Both callbacks keep a stable identity (addCafe and toggleBookmark are stable
 * in ReviewContext), so passing them to memoized cards doesn't re-render the
 * list when unrelated context state changes.
 */
export function useCafeCardActions() {
  const { addCafe, toggleBookmark } = useReviews();

  // The cafe screen reads from the review context, so the cafe is added there
  // before navigating.
  const openCafe = useCallback(
    (cafe: Cafe) => {
      Keyboard.dismiss();
      addCafe(cafe);
      router.push({ pathname: '/cafe/[id]', params: { id: cafe.id } });
    },
    [addCafe]
  );

  // The cafe is passed through so a card the user hasn't opened yet (e.g. on
  // Discover) can still be saved with its name and image.
  const toggleCafeBookmark = useCallback(
    (cafe: Cafe) => {
      addCafe(cafe);
      toggleBookmark(cafe.id, cafe);
    },
    [addCafe, toggleBookmark]
  );

  return { openCafe, toggleCafeBookmark };
}
