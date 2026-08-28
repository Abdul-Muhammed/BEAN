import { useEffect, useMemo, useState } from 'react';
import { getCafeCategories, type CafeCategory } from '../lib/cafeCategories';

/**
 * The category taxonomy plus an id -> category lookup.
 *
 * Everything user-facing stores category *ids* (profiles.preferences,
 * reviews.attributes, cafe_category_tags, the discover filters), so any screen
 * that renders one needs this to turn it back into a label and icon. Backed by
 * the session cache in lib/cafeCategories, so mounting it on many screens costs
 * one query, not one per screen.
 */
export function useCafeCategories() {
  const [categories, setCategories] = useState<CafeCategory[]>([]);

  useEffect(() => {
    let cancelled = false;
    getCafeCategories()
      .then((rows) => {
        if (!cancelled) setCategories(rows);
      })
      .catch((err) => {
        // Non-fatal: callers fall back to rendering the raw id.
        console.warn('Failed to load cafe categories:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byId = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  return { categories, byId };
}

/** Label for a stored category id, falling back to the id itself so an
 *  unknown or not-yet-loaded value still renders as something. */
export function categoryLabel(
  byId: Map<string, CafeCategory>,
  id: string
): string {
  return byId.get(id)?.label ?? id;
}
