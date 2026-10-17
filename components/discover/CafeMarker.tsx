import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { SvgXml } from 'react-native-svg';
import { MARKER_PALETTE, type MarkerKind } from '../../constants/mapMarkerIcons';
import type { PinTier } from '../../lib/mapSearch';

export type ZoomLevel = 'far' | 'medium' | 'close';

export function zoomLevelForDelta(longitudeDelta: number): ZoomLevel {
  if (longitudeDelta > 0.08) return 'far';
  if (longitudeDelta > 0.02) return 'medium';
  return 'close';
}

const MINI_PIN = require('../../assets/images/map_icons/mini-pin.png');

interface CafeMarkerProps {
  id: string;
  latitude: number;
  longitude: number;
  name: string | null;
  rating: number | null;
  tier: PinTier;
  kind: MarkerKind;
  zoom: ZoomLevel;
  selected: boolean;
  onPress: (id: string) => void;
}

/**
 * One cafe pin. Props are plain values and onPress takes the id, so the parent
 * can pass a single stable callback and memo actually skips re-renders; it
 * reads no context for the same reason.
 *
 * Mini pins (the long tail of a dense area) are a native image: no React view
 * to rasterize and nothing to track. Full pins are a custom view that tracks
 * changes only until it has been drawn, per marker, so a pin that arrives in a
 * later fetch still renders instead of showing blank.
 */
function CafeMarker({
  id,
  latitude,
  longitude,
  name,
  rating,
  tier,
  kind,
  zoom,
  selected,
  onPress,
}: CafeMarkerProps) {
  const handlePress = useCallback(
    (e: { stopPropagation?: () => void }) => {
      e.stopPropagation?.();
      onPress(id);
    },
    [id, onPress]
  );

  // A saved/liked or selected cafe always gets the full pin so it stands out.
  const isMini = tier === 'mini' && kind === 'default' && !selected;

  if (isMini) {
    return (
      <Marker
        coordinate={{ latitude, longitude }}
        image={MINI_PIN}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={false}
        onPress={handlePress}
      />
    );
  }

  return (
    <FullPinMarker
      latitude={latitude}
      longitude={longitude}
      name={name}
      rating={rating}
      kind={kind}
      zoom={zoom}
      selected={selected}
      onPress={handlePress}
    />
  );
}

function FullPinMarker({
  latitude,
  longitude,
  name,
  rating,
  kind,
  zoom,
  selected,
  onPress,
}: {
  latitude: number;
  longitude: number;
  name: string | null;
  rating: number | null;
  kind: MarkerKind;
  zoom: ZoomLevel;
  selected: boolean;
  onPress: (e: { stopPropagation?: () => void }) => void;
}) {
  // Track until the current look has had a moment to paint, then stop so
  // panning doesn't re-rasterize every pin. Any change to the look gives it a
  // new key, which tracks again until that key has settled.
  const lookKey = `${kind}|${zoom}|${selected}|${name}|${rating}`;
  const tracks = useSettledKey(lookKey) !== lookKey;

  const palette = MARKER_PALETTE[kind];
  const pillColors = { backgroundColor: palette.bg, borderColor: palette.border };
  const ratingText = rating ? rating.toFixed(1) : '—';

  let body: React.ReactNode;
  if (zoom === 'far' && !selected) {
    body = (
      <View style={[styles.dot, pillColors]}>
        <SvgXml xml={palette.icon} width={14} height={14} />
      </View>
    );
  } else if (zoom === 'medium' && !selected) {
    body = (
      <View style={[styles.pill, pillColors]}>
        <SvgXml xml={palette.icon} width={13} height={13} />
        <Text style={[styles.pillText, { color: palette.text }]}>{ratingText}</Text>
      </View>
    );
  } else {
    body = (
      <View style={[styles.expanded, pillColors, selected && styles.selected]}>
        <SvgXml xml={palette.icon} width={13} height={13} />
        <Text style={[styles.expandedText, { color: palette.text }]} numberOfLines={1}>
          {name ?? 'Cafe'}
        </Text>
        {rating ? (
          <Text style={[styles.expandedRating, { color: palette.text }]}>{ratingText}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracks}
      zIndex={selected ? 1000 : kind === 'default' ? 1 : 10}
      onPress={onPress}
    >
      <View collapsable={false}>
        {body}
      </View>
    </Marker>
  );
}

/**
 * Returns `key` once it has stayed unchanged for `delayMs`, and the previous
 * settled key until then. Custom map markers pass `tracksViewChanges` while
 * their key is unsettled, so a fresh or restyled pin gets painted and an idle
 * one costs nothing.
 */
export function useSettledKey(key: string, delayMs = 300): string | null {
  const [settled, setSettled] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(key), delayMs);
    return () => clearTimeout(timer);
  }, [key, delayMs]);
  return settled;
}

export default React.memo(CafeMarker);

const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 4,
};

const styles = StyleSheet.create({
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...shadow,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    ...shadow,
  },
  pillText: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
  },
  expanded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 200,
    ...shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  selected: {
    borderWidth: 2,
    transform: [{ scale: 1.08 }],
  },
  expandedText: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    maxWidth: 120,
  },
  expandedRating: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    opacity: 0.85,
  },
});
