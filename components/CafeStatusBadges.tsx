import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { FAVORITES_SVG, BOOKMARKS_SVG } from '../constants/savedScreenIcons';

export type CafeBadgeKind = 'liked' | 'saved';

interface CafeStatusBadgesProps {
  liked: boolean;
  saved: boolean;
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
 * cafe. Rendered as a sibling of the card (not a child) and absolutely
 * positioned so it can overhang the card's top-left corner, matching the
 * Figma "Rate" badge (tilted -15deg, centred just inside the corner). Cards
 * set overflow:'hidden', which would otherwise clip it.
 *
 * Purely a status display: pointerEvents is disabled so it never intercepts a
 * tap meant for the card underneath.
 *
 * State comes in as props rather than from ReviewContext, so a badge only
 * re-renders when its own cafe's liked/saved state changes.
 */
function CafeStatusBadges({ liked, saved, hide }: CafeStatusBadgesProps) {
  const showLiked = liked && !hide?.includes('liked');
  const showSaved = saved && !hide?.includes('saved');

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
  // Figma places the tilted badge's bounding box at (-13, -11) from the card's
  // corner; for an untilted 32x24 badge rotated about its centre that is
  // (-10, -7). The left edge stays put whether one badge shows or two.
  container: {
    position: 'absolute',
    top: -7,
    left: -10,
    transform: [{ rotate: '-15deg' }],
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
    // card's elevation or the badge renders beneath them.
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
});
