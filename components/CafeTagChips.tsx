import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useCafeCategories } from '../hooks/useCafeCategories';
import type { CafeTag } from '../lib/cafeTags';
import { colors, fonts } from '@/constants/theme';

interface CafeTagChipsProps {
  tags?: CafeTag[];
  /** Show at most this many, with a "+N" chip for the rest. */
  limit?: number;
  /** Append the vote count, e.g. "Halal · 3". */
  showCounts?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Community tags on a cafe, strongest first.
 *
 * Replaces the old amenity chips, which were fabricated on the client from
 * Google `types` and could only ever read "Has WiFi", "Parking" or "Top Rated" —
 * so a card claimed WiFi while the WiFi filter disagreed. These come from what
 * reviewers actually said, and are the same data the filters query.
 *
 * Renders nothing when a cafe has no tags yet; an empty row of chips is worse
 * than none.
 */
export default function CafeTagChips({
  tags,
  limit = 2,
  showCounts = false,
  style,
}: CafeTagChipsProps) {
  const { byId } = useCafeCategories();

  const list = tags ?? [];
  if (list.length === 0) return null;

  const visible = list.slice(0, limit);
  const remaining = Math.max(0, list.length - limit);

  return (
    <View style={[styles.row, style]}>
      {visible.map((tag) => {
        const category = byId.get(tag.id);
        return (
          <View key={tag.id} style={styles.chip}>
            {!!category?.icon_svg_xml && (
              <SvgXml xml={category.icon_svg_xml} width={12} height={12} />
            )}
            <Text style={styles.chipText} numberOfLines={1}>
              {/* Fall back to the raw id so a tag still reads as something
                  while the taxonomy is loading. */}
              {category?.label ?? tag.id}
              {showCounts && tag.count > 1 ? ` · ${tag.count}` : ''}
            </Text>
          </View>
        );
      })}

      {remaining > 0 && (
        <View style={styles.chip}>
          <Text style={styles.chipText}>+{remaining}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.warmSurface,
  },
  chipText: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: colors.greyNormal,
  },
});
