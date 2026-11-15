import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, type LayoutChangeEvent } from 'react-native';
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

const TAG_GAP = spacing.xs;

/**
 * How many whole chips fit in `available` while leaving room for a "+N" chip
 * when some are left over. Never returns more than CARD_TAG_LIMIT.
 */
function fitChipCount(
  available: number,
  chipWidths: number[],
  plusWidth: number,
  total: number
): number {
  const max = Math.min(CARD_TAG_LIMIT, chipWidths.length);
  for (let k = max; k > 0; k -= 1) {
    let used = 0;
    for (let i = 0; i < k; i += 1) used += chipWidths[i] + (i > 0 ? TAG_GAP : 0);
    if (k < total) used += TAG_GAP + plusWidth;
    if (used <= available) return k;
  }
  return 0;
}

function CardTags({
  attributes,
  categoryById,
}: {
  attributes: CafeAttribute[];
  categoryById: Map<string, CafeCategory>;
}) {
  const [available, setAvailable] = useState<number | null>(null);
  // Natural widths, measured off-screen: one per candidate chip, then "+N".
  const [widths, setWidths] = useState<Record<string, number>>({});

  const candidates = attributes.slice(0, CARD_TAG_LIMIT);
  // Sized for the widest "+N" this card could show, so the reservation holds
  // whichever count ends up displayed.
  const plusLabel = '+' + attributes.length;

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setAvailable((prev) => (prev === w ? prev : w));
  }, []);

  const measure = useCallback(
    (key: string) => (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      setWidths((prev) => (prev[key] === w ? prev : { ...prev, [key]: w }));
    },
    []
  );

  // A cafe nobody has reviewed yet carries no attributes, and shows no chips.
  // The empty View keeps the bean score pushed to the right of the footer row.
  if (attributes.length === 0) return <View />;

  const chipWidths = candidates.map(({ attributeId }) => widths[attributeId]);
  const plusWidth = widths[plusLabel];
  const measured =
    available !== null &&
    plusWidth !== undefined &&
    chipWidths.every((w) => w !== undefined);

  const count = measured
    ? fitChipCount(available, chipWidths as number[], plusWidth, attributes.length)
    : 0;
  const overflow = attributes.length - count;

  const renderChip = ({ attributeId }: CafeAttribute, onLayout?: (e: LayoutChangeEvent) => void) => {
    const category = categoryById.get(attributeId);
    return (
      <View key={attributeId} onLayout={onLayout}>
        <Tag
          label={category?.label ?? attributeId}
          iconXml={category?.icon_svg_xml}
          size="s"
        />
      </View>
    );
  };

  return (
    <View style={styles.cardTags} onLayout={onContainerLayout}>
      {/* Invisible measuring row: absolutely positioned so it never takes up
          space, giving each chip's natural width. */}
      <View style={styles.measureRow} pointerEvents="none" accessible={false}>
        {candidates.map((attr) => renderChip(attr, measure(attr.attributeId)))}
        <View onLayout={measure(plusLabel)}>
          <Tag label={plusLabel} size="s" />
        </View>
      </View>

      {/* Hidden until measured, so a card never flashes a clipped chip. */}
      {measured && (
        <>
          {candidates.slice(0, count).map((attr) => renderChip(attr))}
          {overflow > 0 && <Tag label={'+' + overflow} size="s" style={styles.plus} />}
        </>
      )}
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
            <BeanScore rating={cafe.rating} style={styles.score} />
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
  // One row only. CardTags measures its chips and shows only whole ones that
  // fit beside the score, folding the rest into "+N", so nothing is clipped
  // and the card never grows taller than its neighbours.
  cardTags: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: TAG_GAP,
    overflow: 'hidden',
  },
  measureRow: {
    position: 'absolute',
    left: 0,
    top: 0,
    flexDirection: 'row',
    gap: TAG_GAP,
    opacity: 0,
  },
  plus: {
    flexShrink: 0,
  },
  score: {
    flexShrink: 0,
  },
});
