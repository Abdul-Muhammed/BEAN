import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import FilterChip from './FilterChip';
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
}

/**
 * Summary pill row below the search bar. Three fixed pills (Open Now toggle,
 * Rating, Categories) plus a dismissible pill per active quick-filter.
 */
export default function FilterPillsRow({
  filters,
  onOpenSheet,
  onToggleOpenNow,
  onRemove,
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
        style={styles.shadow}
      />

      <FilterChip
        label={ratingActive ? formatMinRating(filters.minRating) : 'Rating'}
        active={ratingActive}
        showChevron={!ratingActive}
        onPress={onOpenSheet}
        onRemove={ratingActive ? () => onRemove('minRating') : undefined}
        style={styles.shadow}
      />

      <FilterChip
        label={categoriesSummary(filters.categories)}
        active={categoriesActive}
        showChevron={!categoriesActive}
        onPress={onOpenSheet}
        onRemove={categoriesActive ? () => onRemove('categories') : undefined}
        style={styles.shadow}
      />

      {REMOVABLE.filter(({ key }) => filters[key]).map(({ key, label }) => (
        <FilterChip
          key={key}
          label={label}
          active
          onRemove={() => onRemove(key)}
          style={styles.shadow}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
  },
  content: {
    paddingHorizontal: 16,
    gap: 8,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
});
