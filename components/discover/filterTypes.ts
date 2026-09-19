// Shared filter model for the Discover screen filters bottom sheet + pill row.

export type Filters = {
  openNow: boolean;
  topRated: boolean;
  saved: boolean;
  liked: boolean;
  alreadyRated: boolean;
  minRating: number; // 0 = no filter, else 0.5..5 (half steps)
  categories: string[]; // cafe_categories ids (labels are display-only)
};

export const DEFAULT_FILTERS: Filters = {
  openNow: false,
  topRated: false,
  saved: false,
  liked: false,
  alreadyRated: false,
  minRating: 0,
  categories: [],
};

// Boolean quick-filters shown as toggle chips in the sheet's top section.
export const QUICK_FILTERS: { key: keyof Filters; label: string }[] = [
  { key: 'openNow', label: 'Open Now' },
  { key: 'topRated', label: 'Top Rated' },
  { key: 'saved', label: 'Saved' },
  { key: 'liked', label: 'Liked' },
  { key: 'alreadyRated', label: 'Already Rated' },
];

// Active-chip styling from the spec.
export const ACTIVE_CHIP_BG = '#0F1312';

/** Format a min-rating value for a pill label, e.g. 3.5 -> "3.5+", 4 -> "4+". */
export function formatMinRating(value: number): string {
  return `${value}+`;
}

/**
 * Summary label for the Categories pill, e.g. "Has WiFi +2".
 *
 * Filters hold category ids, so the caller passes a lookup to turn the first
 * one into its display label. Falls back to the raw id when the catalogue has
 * not loaded yet.
 */
export function categoriesSummary(
  categories: string[],
  labelFor?: (id: string) => string | undefined
): string {
  if (categories.length === 0) return 'Categories';
  const [first, ...rest] = categories;
  const label = labelFor?.(first) ?? first;
  return rest.length > 0 ? `${label} +${rest.length}` : label;
}

/** True when any filter is set (used to decide if anything is active). */
export function hasAnyFilter(f: Filters): boolean {
  return (
    f.openNow ||
    f.topRated ||
    f.saved ||
    f.liked ||
    f.alreadyRated ||
    f.minRating > 0 ||
    f.categories.length > 0
  );
}
