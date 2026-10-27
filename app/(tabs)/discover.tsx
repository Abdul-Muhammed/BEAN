import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Search, Navigation2 } from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import type { Region } from 'react-native-maps';
import { useReviews } from '../../context/ReviewContext';
import { colors } from '@/constants/theme';
import { SLIDERS_FILTER_SVG } from '@/constants/searchIcons';
import type { MarkerKind } from '../../constants/mapMarkerIcons';
import type { Cafe } from '../../data/mockData';
import FilterPillsRow from '../../components/discover/FilterPillsRow';
import FiltersBottomSheet, {
  type FiltersBottomSheetHandle,
} from '../../components/discover/FiltersBottomSheet';
import CafeMap, { type CafeMapHandle } from '../../components/discover/CafeMap';
import DiscoverSheet, { type DiscoverSheetHandle } from '../../components/discover/DiscoverSheet';
import LocationGateOverlay from '../../components/discover/LocationGateOverlay';
import { AUCKLAND_CBD, useLocation } from '../../hooks/useLocation';
import { useViewportCafes, type ViewportRegion } from '../../hooks/useViewportCafes';
import { useCategories } from '../../hooks/useCategories';
import { cardAttributes, cardToCafe, getCard, type MapPin } from '../../lib/mapSearch';
import type { CafeAttribute } from '../../lib/cafeAttributes';
import {
  type Filters,
  DEFAULT_FILTERS,
  ACTIVE_CHIP_BG,
  hasAnyFilter,
} from '../../components/discover/filterTypes';

const DEFAULT_LATITUDE_DELTA = 0.0422;
const DEFAULT_LONGITUDE_DELTA = 0.0211;
const FOCUS_LATITUDE_DELTA = 0.012;
const FOCUS_LONGITUDE_DELTA = 0.006;

function regionAround(coords: { latitude: number; longitude: number }): Region {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    latitudeDelta: DEFAULT_LATITUDE_DELTA,
    longitudeDelta: DEFAULT_LONGITUDE_DELTA,
  };
}

export default function DiscoverScreen() {
  const { addCafe, isBookmarked, isFavorited, userReviews } = useReviews();
  const mapRef = useRef<CafeMapHandle>(null);
  const sheetRef = useRef<DiscoverSheetHandle>(null);
  const filtersSheetRef = useRef<FiltersBottomSheetHandle>(null);

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const filtersActive = useMemo(() => hasAnyFilter(filters), [filters]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { categoryById } = useCategories();

  const labelForCategory = useCallback(
    (id: string) => categoryById.get(id)?.label,
    [categoryById]
  );

  // The location context is the only source of permission and coordinates on
  // this screen: live GPS when granted, the profile's saved fix otherwise, null
  // when unknown. Granting from the gate updates coords, which re-centres the
  // map below and so reloads the list.
  const { status, coords, isFallback, canAskAgain, requestPermission } = useLocation();
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

  const initialRegion = useMemo(() => regionAround(coords ?? AUCKLAND_CBD), []); // eslint-disable-line react-hooks/exhaustive-deps

  // The region the map last settled on. Starts at the initial region so the
  // first fetch doesn't wait for the map to report.
  const [settledRegion, setSettledRegion] = useState<ViewportRegion>(initialRegion);
  const userMovedMapRef = useRef(false);
  // Where the camera was last sent (or last settled). A settled region close to
  // it is our own move or the map's initial report (Android sends one on load);
  // anything else is the user panning or zooming.
  const lastTargetRef = useRef<Region>(initialRegion);

  // Programmatic camera moves. The map reports the new region when the
  // animation settles, and that report is what updates settledRegion (and so
  // fetches), exactly as a user pan does.
  const flyTo = useCallback((next: Region, durationMs: number) => {
    lastTargetRef.current = next;
    mapRef.current?.animateToRegion(next, durationMs);
  }, []);

  // Follow the user's location until they pan the map themselves: coords can
  // arrive after mount (GPS resolving, or permission granted from the gate).
  const coordsKey = coords ? `${coords.latitude.toFixed(5)},${coords.longitude.toFixed(5)}` : '';
  useEffect(() => {
    if (!coords || userMovedMapRef.current) return;
    flyTo(regionAround(coords), 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordsKey]);

  const handleRegionSettled = useCallback((region: Region) => {
    const target = lastTargetRef.current;
    const tolerance = target.longitudeDelta * 0.05;
    const panned =
      Math.abs(region.latitude - target.latitude) > tolerance ||
      Math.abs(region.longitude - target.longitude) > tolerance;
    const zoomed = Math.abs(Math.log2(region.longitudeDelta / target.longitudeDelta)) > 0.25;
    if (panned || zoomed) userMovedMapRef.current = true;
    lastTargetRef.current = region;
    setSettledRegion(region);
  }, []);

  const { pins, list, total, isLoading, isFetching, error, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useViewportCafes({ region: settledRegion, attributes: filters.categories });

  const handleEnableLocation = useCallback(async () => {
    setIsRequestingLocation(true);
    try {
      await requestPermission();
    } finally {
      setIsRequestingLocation(false);
    }
  }, [requestPermission]);

  // Cafe ids the current user has reviewed — drives the "Already Rated" filter.
  const reviewedCafeIds = useMemo(
    () => new Set(userReviews.map((review) => review.cafeId)),
    [userReviews]
  );

  const attributesFor = useCallback(
    (cafeId: string): CafeAttribute[] | undefined => {
      const card = getCard(cafeId);
      return card ? cardAttributes(card) : undefined;
    },
    []
  );

  // Client-side filters. Categories are applied by the server (AND across
  // the selection) for both pins and list; this checks them again only for the
  // sheet's live count over an uncommitted draft.
  const matchesFilters = useCallback(
    (cafe: { id: string; rating: number | null; hours?: Cafe['hours'] }, f: Filters) => {
      const rating = cafe.rating ?? 0;
      if (f.openNow && cafe.hours?.openNow !== true) return false;
      if (f.topRated && rating < 4.5) return false;
      if (f.saved && !isBookmarked(cafe.id)) return false;
      if (f.liked && !isFavorited(cafe.id)) return false;
      if (f.alreadyRated && !reviewedCafeIds.has(cafe.id)) return false;
      if (f.minRating > 0 && rating < f.minRating) return false;
      return true;
    },
    [isBookmarked, isFavorited, reviewedCafeIds]
  );

  const listCafes = useMemo(
    () => list.map(cardToCafe).filter((cafe) => matchesFilters(cafe, filters)),
    [list, matchesFilters, filters]
  );

  const visiblePins = useMemo(
    () =>
      pins.filter((pin: MapPin) =>
        matchesFilters({ id: pin.place_id, rating: pin.rating }, filters)
      ),
    [pins, matchesFilters, filters]
  );

  const countFor = useCallback(
    (f: Filters) =>
      list.filter((card) => {
        if (!matchesFilters({ id: card.place_id, rating: card.rating }, f)) return false;
        if (f.categories.length === 0) return true;
        const ids = new Set(card.attributes.map((a) => a.attribute));
        return f.categories.every((id) => ids.has(id));
      }).length,
    [list, matchesFilters]
  );

  // When exactly one of Saved/Liked is filtered, style by that filter so the
  // map reads consistently. Otherwise favorited > saved > default.
  const kindFor = useCallback(
    (placeId: string): MarkerKind => {
      const favorited = isFavorited(placeId);
      const bookmarked = isBookmarked(placeId);
      if (filters.saved && !filters.liked && bookmarked) return 'saved';
      if (filters.liked && !filters.saved && favorited) return 'favorite';
      return favorited ? 'favorite' : bookmarked ? 'saved' : 'default';
    },
    [filters.saved, filters.liked, isBookmarked, isFavorited]
  );

  // The cafe screen reads from the review context, so a cafe is added there
  // only when the user actually opens it.
  const openCafe = useCallback(
    (cafe: Cafe) => {
      addCafe(cafe);
      router.push(`/cafe/${cafe.id}`);
    },
    [addCafe]
  );

  // First tap on a pin selects it and brings its card into view; a second tap
  // opens the cafe. A pin whose card isn't in the loaded list opens directly.
  const handlePinPress = useCallback(
    (placeId: string) => {
      const inList = listCafes.some((c) => c.id === placeId);
      if (selectedId === placeId || !inList) {
        const card = getCard(placeId);
        const pin = pins.find((p) => p.place_id === placeId);
        if (card) {
          openCafe(cardToCafe(card));
        } else if (pin) {
          openCafe(
            cardToCafe({
              place_id: pin.place_id,
              name: pin.name,
              formatted_address: null,
              rating: pin.rating,
              latitude: pin.latitude,
              longitude: pin.longitude,
              thumbnail_url: null,
              distance_meters: null,
              attributes: [],
            })
          );
        }
        return;
      }
      setSelectedId(placeId);
      sheetRef.current?.revealCafe(placeId);
    },
    [listCafes, selectedId, pins, openCafe]
  );

  // Tapping a card opens the cafe and leaves its pin highlighted and centred,
  // so coming back lands on the same spot.
  const handleCardPress = useCallback(
    (cafe: Cafe) => {
      setSelectedId(cafe.id);
      if (typeof cafe.latitude === 'number' && typeof cafe.longitude === 'number') {
        userMovedMapRef.current = true;
        lastTargetRef.current = {
          ...lastTargetRef.current,
          latitude: cafe.latitude,
          longitude: cafe.longitude,
        };
        mapRef.current?.animateToCoordinate(
          { latitude: cafe.latitude, longitude: cafe.longitude },
          400
        );
      }
      openCafe(cafe);
    },
    [openCafe]
  );

  const handleMapPress = useCallback(() => setSelectedId(null), []);

  const handleLocateMe = useCallback(async () => {
    if (coords) {
      userMovedMapRef.current = false;
      flyTo(
        { ...coords, latitudeDelta: FOCUS_LATITUDE_DELTA, longitudeDelta: FOCUS_LONGITUDE_DELTA },
        500
      );
      return;
    }
    // No coordinates yet: ask (or route to Settings). A grant updates coords,
    // and the effect above re-centres the map.
    userMovedMapRef.current = false;
    await requestPermission();
  }, [coords, requestPermission, flyTo]);

  const toggleOpenNow = useCallback(() => {
    setFilters((prev) => ({ ...prev, openNow: !prev.openNow }));
  }, []);

  const removeFilter = useCallback(
    (key: 'topRated' | 'saved' | 'liked' | 'alreadyRated' | 'minRating' | 'categories') => {
      setFilters((prev) => {
        if (key === 'minRating') return { ...prev, minRating: 0 };
        if (key === 'categories') return { ...prev, categories: [] };
        return { ...prev, [key]: false };
      });
    },
    []
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const showSpinner = isLoading || (isFetching && pins.length === 0);
  const errorMessage = error ? 'Unable to load cafes here.' : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.mapContainer}>
        <CafeMap
          ref={mapRef}
          initialRegion={initialRegion}
          pins={visiblePins}
          kindFor={kindFor}
          selectedId={selectedId}
          showsUserLocation={status === 'granted'}
          onRegionSettled={handleRegionSettled}
          onPinPress={handlePinPress}
          onMapPress={handleMapPress}
        />

        {isFallback && (
          <LocationGateOverlay
            requesting={isRequestingLocation}
            mustUseSettings={!canAskAgain}
            onEnable={handleEnableLocation}
          />
        )}

        {/* Search bar + filters button — siblings on one row, never nested */}
        <View style={styles.searchRow}>
          <TouchableOpacity
            style={styles.searchContainer}
            onPress={() => router.push('/search-cafes')}
            activeOpacity={0.85}
          >
            <Search size={20} color="#8E8E93" style={styles.searchIcon} />
            <Text style={styles.searchPlaceholder}>Search Cafes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filtersButton, filtersActive && styles.filtersButtonActive]}
            onPress={() => filtersSheetRef.current?.open()}
            activeOpacity={0.7}
          >
            <SvgXml
              xml={SLIDERS_FILTER_SVG}
              width={20}
              height={18}
              color={filtersActive ? colors.surface : colors.primary}
            />
          </TouchableOpacity>
        </View>

        <FilterPillsRow
          filters={filters}
          onOpenSheet={() => filtersSheetRef.current?.open()}
          onToggleOpenNow={toggleOpenNow}
          onRemove={removeFilter}
          labelForCategory={labelForCategory}
        />

        {(showSpinner || errorMessage) && (
          <View style={styles.statusBubble} pointerEvents="none">
            {showSpinner ? (
              <>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.statusBubbleText}>Finding cafes…</Text>
              </>
            ) : (
              <Text style={styles.statusBubbleText}>{errorMessage}</Text>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.locateButton} onPress={handleLocateMe} activeOpacity={0.85}>
          <Navigation2
            size={20}
            color={colors.primary}
            fill={status === 'granted' ? colors.primary : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      <DiscoverSheet
        ref={sheetRef}
        cafes={listCafes}
        total={total}
        attributesFor={attributesFor}
        categoryById={categoryById}
        selectedId={selectedId}
        isLoading={showSpinner}
        isFetchingMore={isFetchingNextPage}
        emptyMessage={errorMessage ?? 'Try moving the map or adjusting your filters.'}
        onCardPress={handleCardPress}
        onEndReached={handleEndReached}
      />

      <FiltersBottomSheet
        ref={filtersSheetRef}
        committed={filters}
        onApply={setFilters}
        countFor={countFor}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  searchRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
  // Standalone control beside the search bar. Mirrors the search pill's
  // surface, radius and shadow so the two read as a deliberate pair.
  filtersButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  filtersButtonActive: {
    backgroundColor: ACTIVE_CHIP_BG,
  },
  statusBubble: {
    position: 'absolute',
    top: 134,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  statusBubbleText: {
    fontSize: 13,
    fontFamily: 'Lato-Regular',
    color: colors.primary,
  },
  locateButton: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
});
