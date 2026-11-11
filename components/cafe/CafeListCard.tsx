import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SvgXml } from 'react-native-svg';

import CafeCard from '../ui/CafeCard';
import BeanScore from '../ui/BeanScore';
import Tag from '../ui/Tag';
import CafeStatusBadges, { type CafeBadgeKind } from '../CafeStatusBadges';
import { BOOKMARK_24_FILLED_SVG, BOOKMARK_24_SVG } from '@/constants/figmaIcons';
import { spacing } from '@/constants/theme';
import { extractLocation } from '../../lib/geo';
import type { Cafe } from '../../data/mockData';
import type { CafeAttribute } from '../../lib/cafeAttributes';
import type { CafeCategory } from '../../lib/cafeCategories';

/** How many amenity chips a card shows before collapsing the rest into "+N". */
const CARD_TAG_LIMIT = 2;

/** Shared empty array so a chipless card keeps a stable prop identity. */
export const EMPTY_ATTRIBUTES: CafeAttribute[] = [];

function CardTags({
  attributes,
  categoryById,
}: {
  attributes: CafeAttribute[];
  categoryById: Map<string, CafeCategory>;
}) {
  // A cafe nobody has reviewed yet carries no attributes, and shows no chips.
  // The empty View keeps the bean score pushed to the right of the footer row.
  if (attributes.length === 0) return <View />;

  const shown = attributes.slice(0, CARD_TAG_LIMIT);
  const overflow = attributes.length - shown.length;

  return (
    <View style={styles.cardTags}>
      {shown.map(({ attributeId }) => {
        const category = categoryById.get(attributeId);
        return (
          <Tag
            key={attributeId}
            label={category?.label ?? attributeId}
            iconXml={category?.icon_svg_xml}
            size="s"
          />
        );
      })}
      {overflow > 0 && <Tag label={'+' + overflow} size="s" />}
    </View>
  );
}

export interface CafeListCardProps {
  cafe: Cafe;
  /** Pre-formatted distance, e.g. "2.1 km". Omitted when unknown. */
  distanceLabel?: string;
  /** Crowdsourced attributes, most-agreed first. Pass EMPTY_ATTRIBUTES for none. */
  attributes: CafeAttribute[];
  categoryById: Map<string, CafeCategory>;
  bookmarked: boolean;
  favorited: boolean;
  /** Usually useCafeCardActions().openCafe; Discover wraps it to recentre the map. */
  onPress: (cafe: Cafe) => void;
  /** Usually useCafeCardActions().toggleCafeBookmark. */
  onToggleBookmark: (cafe: Cafe) => void;
  /** Suppress status badges whose state the surrounding list already implies. */
  hideBadges?: CafeBadgeKind[];
}

/**
 * The Figma "Cafe Card" as used in every cafe list: Home sections, the Discover
 * sheet, Lists and list detail. An 87pt image, the name, a pin with
 * "suburb • distance", a save toggle, up to two amenity chips plus "+N", and the
 * bean score.
 *
 * Memoized, and deliberately reads no context: the parent passes the per-cafe
 * state (bookmarked, favorited, distance) and stable callbacks, so toggling one
 * cafe re-renders that one card rather than the whole list.
 */
function CafeListCard({
  cafe,
  distanceLabel,
  attributes,
  categoryById,
  bookmarked,
  favorited,
  onPress,
  onToggleBookmark,
  hideBadges,
}: CafeListCardProps) {
  const handlePress = useCallback(() => onPress(cafe), [onPress, cafe]);
  const handleToggle = useCallback(() => onToggleBookmark(cafe), [onToggleBookmark, cafe]);

  return (
    // The status badge overhangs the card's corner and the card clips its own
    // children, so the badge is a sibling in this unclipped wrapper.
    <View>
      <CafeCard
        name={cafe.name}
        city={extractLocation(cafe.location)}
        distanceLabel={distanceLabel}
        imageUri={cafe.image}
        onPress={handlePress}
        trailing={
          <TouchableOpacity
            onPress={handleToggle}
            hitSlop={8}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: bookmarked }}
            accessibilityLabel={bookmarked ? 'Unsave ' + cafe.name : 'Save ' + cafe.name}
          >
            <SvgXml
              xml={bookmarked ? BOOKMARK_24_FILLED_SVG : BOOKMARK_24_SVG}
              width={24}
              height={24}
            />
          </TouchableOpacity>
        }
        footer={
          <>
            <CardTags attributes={attributes} categoryById={categoryById} />
            <BeanScore rating={cafe.rating} />
          </>
        }
      />
      {/* Only the heart overhangs the corner, as in Figma: the filled save icon
          already shows the saved state, so a saved badge would repeat it. */}
      <CafeStatusBadges liked={favorited} saved={false} hide={hideBadges} />
    </View>
  );
}

export default React.memo(CafeListCard);

const styles = StyleSheet.create({
  cardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
});
