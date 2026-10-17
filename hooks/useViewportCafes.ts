import { useEffect, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  bboxFromRegion,
  fetchCafesInBbox,
  rememberCards,
  snapBbox,
  zoomForLongitudeDelta,
  type BboxPage,
  type CafeCard,
  type MapPin,
} from '../lib/mapSearch';
import { searchCafesNearbyByCoords } from '../services/googlePlaces';
import { approximateDistanceMeters } from '../lib/geo';

export interface ViewportRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const LIST_PAGE_SIZE = 20;
const LAST_VIEWPORT_KEY = '@bean/last_viewport';
// Below this many pins at street-level zoom the area is probably unexplored, so
// ask the nearby-cafes function to fill it from Google in the background. The
// function itself allows one Google fill per tile per 30 days for all users.
const BACKFILL_MIN_PINS = 5;
const BACKFILL_MIN_ZOOM = 13;

type PageData = InfiniteData<BboxPage, number>;

interface StoredViewport {
  key: string;
  page: BboxPage;
}

function queryKeyFor(bboxKey: string, attributes: string[]) {
  return ['cafes-bbox', bboxKey, attributes.join(',')] as const;
}

// The last viewport the user saw, read once per app launch. Seeding the query
// with it paints pins on a cold start before the network answers (Airbnb ships
// its first page in the HTML for the same reason).
let storedViewport: Promise<StoredViewport | null> | null = null;
function readStoredViewport(): Promise<StoredViewport | null> {
  if (!storedViewport) {
    storedViewport = AsyncStorage.getItem(LAST_VIEWPORT_KEY)
      .then((raw) => (raw ? (JSON.parse(raw) as StoredViewport) : null))
      .catch(() => null);
  }
  return storedViewport;
}

const EMPTY_PINS: MapPin[] = [];
const EMPTY_LIST: CafeCard[] = [];

/**
 * Cafes for the settled map viewport: lean pins for the map and a paged list of
 * full cards for the sheet, from one cafes_in_bbox call per move.
 *
 * The bbox is snapped outward to a zoom-dependent grid, so small pans reuse the
 * cached result with no request. While a new area loads, the previous pins stay
 * on screen. Requests for an area the user has already left are aborted.
 */
export function useViewportCafes({
  region,
  attributes,
  enabled = true,
}: {
  region: ViewportRegion | null;
  attributes: string[];
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();

  const bbox = useMemo(() => (region ? snapBbox(bboxFromRegion(region)) : null), [region]);
  const bboxKey = bbox ? `${bbox.swLat},${bbox.swLng},${bbox.neLat},${bbox.neLng}` : '';
  const attrKey = attributes.join(',');
  const queryKey = useMemo(
    () => queryKeyFor(bboxKey, attrKey ? attrKey.split(',') : []),
    [bboxKey, attrKey]
  );

  // Seed from the stored viewport when it is exactly this one.
  useEffect(() => {
    if (!bboxKey || attrKey) return;
    let cancelled = false;
    readStoredViewport().then((stored) => {
      if (cancelled || !stored || stored.key !== bboxKey) return;
      if (queryClient.getQueryData(queryKey)) return;
      rememberCards(stored.page.list);
      queryClient.setQueryData<PageData>(
        queryKey,
        { pages: [stored.page], pageParams: [0] },
        // Stale on arrival, so it is refreshed in the background.
        { updatedAt: 0 }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [bboxKey, attrKey, queryClient, queryKey]);

  const query = useInfiniteQuery({
    queryKey,
    enabled: enabled && !!bbox,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      fetchCafesInBbox(bbox!, {
        attributes: attrKey ? attrKey.split(',') : [],
        cursor: pageParam,
        listLimit: LIST_PAGE_SIZE,
        // Further list pages don't need the pins again.
        includePins: pageParam === 0,
        signal,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });

  const firstPage = query.data?.pages[0];
  const pins = firstPage?.pins ?? EMPTY_PINS;
  const list = useMemo(() => {
    if (!query.data) return EMPTY_LIST;
    const seen = new Set<string>();
    const out: CafeCard[] = [];
    query.data.pages.forEach((page) =>
      page.list.forEach((card) => {
        if (!seen.has(card.place_id)) {
          seen.add(card.place_id);
          out.push(card);
        }
      })
    );
    return out;
  }, [query.data]);

  // Remember the unfiltered first page for the next cold start.
  useEffect(() => {
    if (query.isPlaceholderData || !firstPage || attrKey || !bboxKey) return;
    const payload: StoredViewport = { key: bboxKey, page: firstPage };
    AsyncStorage.setItem(LAST_VIEWPORT_KEY, JSON.stringify(payload)).catch(() => {});
    storedViewport = Promise.resolve(payload);
  }, [firstPage, query.isPlaceholderData, attrKey, bboxKey]);

  // Background Google backfill for sparse, unfiltered, street-level views. Never
  // awaited by the UI; when it adds cafes the viewport is refetched.
  const backfilledRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!region || !firstPage || query.isPlaceholderData || attrKey) return;
    if (firstPage.pins.length >= BACKFILL_MIN_PINS) return;
    if (zoomForLongitudeDelta(region.longitudeDelta) < BACKFILL_MIN_ZOOM) return;
    if (backfilledRef.current.has(bboxKey)) return;
    backfilledRef.current.add(bboxKey);

    const radius = Math.min(
      Math.max(
        approximateDistanceMeters(
          region.latitude,
          region.longitude,
          region.latitude + region.latitudeDelta / 2,
          region.longitude + region.longitudeDelta / 2
        ),
        600
      ),
      50000
    );
    searchCafesNearbyByCoords(region.latitude, region.longitude, radius, 1)
      .then((results) => {
        if (results.length > firstPage.pins.length) {
          queryClient.invalidateQueries({ queryKey });
        }
      })
      .catch(() => {});
  }, [region, firstPage, query.isPlaceholderData, attrKey, bboxKey, queryClient, queryKey]);

  return {
    pins,
    list,
    total: firstPage?.total ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}
