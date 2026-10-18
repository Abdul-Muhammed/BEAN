import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { searchCafesInDb, type CafeCard } from '../lib/mapSearch';
import { searchCafesByText } from '../services/googlePlaces';

export const MIN_QUERY_LENGTH = 2;
// The database search is cheap, so this only needs to skip the intermediate
// keystrokes of fast typing. It used to be 800 ms because every search could
// hit Google.
const SEARCH_DEBOUNCE_MS = 250;
const EMPTY: CafeCard[] = [];

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Cafe search: the search_cafes RPC on every (debounced) query, ranked by match
 * then distance. Stale requests are aborted, so a slow earlier response can
 * never replace a newer one.
 *
 * Google is a separate step: only when the database has nothing for a query is
 * the search-cafes function asked, once per query per hour, and it fills the
 * database for next time.
 */
export function useCafeSearch(
  query: string,
  coords: { latitude: number; longitude: number } | null
) {
  const term = useDebounced(query.trim(), SEARCH_DEBOUNCE_MS);
  const enabled = term.length >= MIN_QUERY_LENGTH;
  // Rounded so the cache key doesn't change on every GPS jitter.
  const lat = coords ? Math.round(coords.latitude * 100) / 100 : null;
  const lng = coords ? Math.round(coords.longitude * 100) / 100 : null;

  const dbQuery = useQuery({
    queryKey: ['cafe-search', term.toLowerCase(), lat, lng],
    enabled,
    queryFn: ({ signal }) => searchCafesInDb(term, { latitude: lat, longitude: lng, signal }),
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
  });

  const dbEmpty = enabled && dbQuery.isSuccess && !dbQuery.isPlaceholderData &&
    (dbQuery.data?.length ?? 0) === 0;

  // Only runs for queries the database could not answer.
  const googleQuery = useQuery({
    queryKey: ['cafe-search-google', term.toLowerCase()],
    enabled: dbEmpty,
    queryFn: () => searchCafesByText(term),
    staleTime: 60 * 60 * 1000,
  });

  const isTyping = query.trim() !== term;
  const results = enabled ? dbQuery.data ?? EMPTY : EMPTY;

  return {
    term,
    results,
    /** Google-backed results for a query the database had nothing for. */
    googleResults: dbEmpty ? googleQuery.data ?? [] : [],
    isSearching: enabled && (isTyping || dbQuery.isFetching),
    isSearchingMore: dbEmpty && googleQuery.isFetching,
    error: dbQuery.error,
  };
}
