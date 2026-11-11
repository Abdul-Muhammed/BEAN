import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import FilterChip from './FilterChip';
import { SHOP_OPEN_12_SVG } from '@/constants/figmaIcons';
import { spacing } from '@/constants/theme';
import {
  type Filters,
  categoriesSummary,
  formatMinRating,
} from './filterTypes';

/** Boolean quick-filters that appear as their own dismissible pill when active. */
type RemovableKey = 'topRated' | 'saved' | 'liked' | 'alreadyRated';

const REMOVABLE: { key: RemovableKey; label: string }[] = [
  { key: 'topRated', label: 'Top Rated' },
  { key: 'saved', label: 'Saved' },
  { key: 'liked', label: 'Liked' },
  { key: 'alreadyRated', label: 'Already Rated' },
];

interface FilterPillsRowProps {
  filters: Filters;
  onOpenSheet: () => void;
  onToggleOpenNow: () => void;
  onRemove: (key: RemovableKey | 'minRating' | 'categories') => void;
  /** Turns a stored category id into its display label for the summary pill. */
  labelForCategory?: (id: string) => string | undefined;
}

const OPEN_NOW_ICON = <SvgXml xml={SHOP_OPEN_12_SVG} width={12} height={12} />;

/**
 * Summary pill row below the search bar, in the Discover header (Figma
 * "Search / Results"). Rendered inline, not over the map. Three fixed pills (Open Now toggle,
 * Rating, Categories) plus a dismissible pill per active quick-filter.
 */
export default function FilterPillsRow({
  filters,
  onOpenSheet,
  onToggleOpenNow,
  onRemove,
  labelForCategory,
}: FilterPillsRowProps) {
  const ratingActive = filters.minRating > 0;
  const categoriesActive = filters.categories.length > 0;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <FilterChip
        label="Open Now"
        active={filters.openNow}
        onPress={onToggleOpenNow}
        leadingIcon={OPEN_NOW_ICON}
        onRemove={filters.openNow ? onToggleOpenNow : undefined}
        compact
      />

      <FilterChip
        label={ratingActive ? formatMinRating(filters.minRating) : 'Rating'}
        active={ratingActive}
        showChevron={!ratingActive}
        onPress={onOpenSheet}
        onRemove={ratingActive ? () => onRemove('minRating') : undefined}
        compact
      />

      <FilterChip
        label={categoriesSummary(filters.categories, labelForCategory)}
        active={categoriesActive}
        showChevron={!categoriesActive}
        onPress={onOpenSheet}
        onRemove={categoriesActive ? () => onRemove('categories') : undefined}
        compact
      />

      {REMOVABLE.filter(({ key }) => filters[key]).map(({ key, label }) => (
        <FilterChip
          key={key}
          label={label}
          active
          onRemove={() => onRemove(key)}
          compact
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
});
