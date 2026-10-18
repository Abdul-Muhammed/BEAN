import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCafeCategories, type CafeCategory } from '../lib/cafeCategories';

const EMPTY: CafeCategory[] = [];

/**
 * The active category catalogue, fetched once and shared by every screen that
 * renders chips or filters (it used to be fetched three times on Discover
 * alone). Persisted, so chips have labels on a cold start before the network
 * answers.
 */
export function useCategories() {
  const { data } = useQuery({
    queryKey: ['cafe-categories'],
    queryFn: getCafeCategories,
    staleTime: 60 * 60 * 1000,
    meta: { persist: true },
  });
  const categories = data ?? EMPTY;

  const categoryById = useMemo(() => {
    const map = new Map<string, CafeCategory>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  return { categories, categoryById };
}
