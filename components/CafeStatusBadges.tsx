import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useReviews } from '../context/ReviewContext';
import { FAVORITES_SVG, BOOKMARKS_SVG } from '../constants/savedScreenIcons';

export type CafeBadgeKind = 'liked' | 'saved';

interface CafeStatusBadgesProps {
  cafeId: string;
  /**
   * Badges to suppress in contexts where the state is implied by the screen
   * itself — e.g. every card on the Favorites list is liked, so a heart on each
   * one carries no information. The cross-state (a saved cafe you also liked)
   * still shows through.
   */
  hide?: CafeBadgeKind[];
}

const BADGE_WIDTH = 32;
const BADGE_HEIGHT = 24;

/**
 * Corner overlay showing whether the current user has liked and/or saved a
 * cafe. Rendered as a sibling of the card (not a child), absolutely positioned
 * against a padded wrapper so it can overhang the card's corner — cards set
 * overflow:'hidden', which would otherwise clip it.
 *
 * Purely a status display: pointerEvents is disabled so it never intercepts a
 * tap meant for the card underneath. Saving/unsaving stays with the existing
 * in-card bookmark control.
 *
 * Reads state straight from ReviewContext (as CafeMarkerView does on Discover)
 * so every card can drop it in with just a cafeId, and a like/save toggle
 * re-renders only this badge rather than the memoized card around it.
 */
function CafeStatusBadges({ cafeId, hide }: CafeStatusBadgesProps) {
  const { isFavorited, isBookmarked } = useReviews();

  const showLiked = !hide?.includes('liked') && isFavorited(cafeId);
  const showSaved = !hide?.includes('saved') && isBookmarked(cafeId);

  if (!showLiked && !showSaved) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {showLiked && (
        <View style={styles.badge}>
          <SvgXml xml={FAVORITES_SVG} width={BADGE_WIDTH} height={BADGE_HEIGHT} />
        </View>
      )}
      {showSaved && (
        <View style={styles.badge}>
          <SvgXml xml={BOOKMARKS_SVG} width={BADGE_WIDTH} height={BADGE_HEIGHT} />
        </View>
      )}
    </View>
  );
}

export default React.memo(CafeStatusBadges);

const styles = StyleSheet.create({
  // Anchored to the wrapper's top-left so the row sits diagonally off the
  // card's corner. The left edge stays put whether one badge shows or two.
  container: {
    position: 'absolute',
    top: 2,
    left: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 10,
  },
  // The SVGs carry their own fill and 1px border; the shadow only lifts them
  // off the cafe photo that sits under the top-left corner of the row cards.
  badge: {
    borderRadius: 12,
    // Android draws by elevation before z-index, so this has to clear the
    // cards' own elevation (3) or the badge renders beneath them.
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
});
