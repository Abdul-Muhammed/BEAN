import { useEffect, useMemo, useState } from 'react';
import {
  getAttributesForCafes,
  type CafeAttribute,
} from '../lib/cafeAttributes';
import { getCafeCategories, type CafeCategory } from '../lib/cafeCategories';

/** Shared empty array so a chipless card keeps a stable prop identity. */
const EMPTY: CafeAttribute[] = [];

/**
 * Crowdsourced attributes for a set of cafes, plus the category catalogue
 * needed to turn the stored ids into labels and icons.
 *
 * One query for the whole list rather than one per card, re-run when the set of
 * cafe ids changes. Both sources are Supabase, so using this on another screen
 * costs no Google Places usage.
 */
export function useCafeAttributes(cafeIds: string[]) {
  const [attributes, setAttributes] = useState<Map<string, CafeAttribute[]>>(new Map());
  const [categories, setCategories] = useState<CafeCategory[]>([]);

  useEffect(() => {
    let cancelled = false;
    getCafeCategories()
      .then((rows) => {
        if (!cancelled) setCategories(rows);
      })
      .catch(() => {
        /* Chips fall back to the raw id. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keyed on the joined ids: the array identity changes every render, the
  // contents rarely do.
  const key = cafeIds.join(',');
  useEffect(() => {
    let cancelled = false;
    const ids = key ? key.split(',') : [];
    if (ids.length === 0) {
      setAttributes(new Map());
      return;
    }
    getAttributesForCafes(ids).then((map) => {
      if (!cancelled) setAttributes(map);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const categoryById = useMemo(() => {
    const map = new Map<string, CafeCategory>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const attributesFor = useMemo(
    () => (cafeId: string) => attributes.get(cafeId) ?? EMPTY,
    [attributes]
  );

  return { attributesFor, categoryById };
}
