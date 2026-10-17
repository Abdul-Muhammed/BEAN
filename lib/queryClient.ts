import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

/**
 * One query cache for the app. Map viewports, searches and the category
 * catalogue are cached here so revisiting an area or repeating a search needs
 * no request, and concurrent screens asking for the same data share one.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cafe data changes slowly; a viewport fetched a minute ago is fine.
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Bump to discard persisted caches whose shape no longer matches. */
export const QUERY_CACHE_BUSTER = 'map-search-v1';

// Only the queries marked `meta: { persist: true }` are written to disk (the
// last map viewport and the category catalogue), so a cold start can paint
// pins before the network answers without persisting every search.
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: '@bean/query_cache',
  throttleTime: 2000,
});
