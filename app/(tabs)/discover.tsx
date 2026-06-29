import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Search, Navigation2 } from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import MapCafeCard from '../../components/MapCafeCard';
import { useReviews } from '../../context/ReviewContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import {
  searchCafesNearbyByCoords,
  convertPlaceToCafe,
  enrichCafeWithDetails,
  isNzCafe,
} from '../../services/googlePlaces';
import { colors } from '@/constants/theme';
import { SLIDERS_FILTER_SVG } from '@/constants/searchIcons';
import { MARKER_PALETTE, type MarkerKind } from '../../constants/mapMarkerIcons';
import { approximateDistanceMeters } from '../../lib/geo';
import type { Cafe } from '../../data/mockData';
import FilterPillsRow from '../../components/discover/FilterPillsRow';
import FiltersBottomSheet, {
  type FiltersBottomSheetHandle,
} from '../../components/discover/FiltersBottomSheet';
import {
  type Filters,
  DEFAULT_FILTERS,
} from '../../components/discover/filterTypes';

// Auckland fallback when no profile coords and no permission.
const DEFAULT_LATITUDE = -36.8485;
const DEFAULT_LONGITUDE = 174.7633;
const DEFAULT_LATITUDE_DELTA = 0.0422;
const DEFAULT_LONGITUDE_DELTA = 0.0211;
const NEARBY_CAFE_LIST_LIMIT = 7;
const NEARBY_CAFE_SEARCH_RADIUS_METERS = 5000;
const LOCATION_REFRESH_THRESHOLD_METERS = 250;
const NEARBY_CAFES_CACHE_KEY = '@bean/discover_nearby_cafes';

// Apple-Maps-like custom style for Google Maps on Android. Hides POI/transit
// noise so cafe markers are the visual focus.
const APPLE_LIKE_MAP_STYLE = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

type ZoomLevel = 'far' | 'medium' | 'close';

function zoomLevelForDelta(longitudeDelta: number): ZoomLevel {
  if (longitudeDelta > 0.08) return 'far';
  if (longitudeDelta > 0.02) return 'medium';
  return 'close';
}

// Approximate radius in meters that fully covers the visible map region.
// This is used for map markers only; the bottom sheet stays user-location based.
function radiusFromRegion(region: Region): number {
  const METERS_PER_DEGREE_LAT = 111000;
  const latMeters = region.latitudeDelta * METERS_PER_DEGREE_LAT;
  const lngMeters =
    region.longitudeDelta *
    METERS_PER_DEGREE_LAT *
    Math.cos((region.latitude * Math.PI) / 180);
  const halfDiagonal = Math.sqrt(latMeters * latMeters + lngMeters * lngMeters) / 2;
  const radius = halfDiagonal * 1.2;
  return Math.min(Math.max(radius, 600), 50000);
}

interface CachedNearbyCafes {
  latitude: number;
  longitude: number;
  cafes: Cafe[];
}

function getPlaceDistanceMeters(
  place: any,
  coords: { latitude: number; longitude: number }
): number {
  const lat = place?.geometry?.location?.lat;
  const lng = place?.geometry?.location?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return Number.POSITIVE_INFINITY;
  }

  return approximateDistanceMeters(coords.latitude, coords.longitude, lat, lng);
}

function mergeCafesById(previous: Cafe[], next: Cafe[]): Cafe[] {
  const merged = new Map(previous.map((cafe) => [cafe.id, cafe]));
  next.forEach((cafe) => {
    const existing = merged.get(cafe.id);
    const combined = { ...existing, ...cafe } as Cafe;
    // Don't let an incoming rating of 0/undefined wipe a real rating that was
    // already loaded for this cafe.
    if (!cafe.rating && existing?.rating) {
      combined.rating = existing.rating;
    }
    merged.set(cafe.id, combined);
  });
  return Array.from(merged.values());
}

interface CafeMarkerViewProps {
  cafe: Cafe;
  zoom: ZoomLevel;
}

function CafeMarkerView({ cafe, zoom }: CafeMarkerViewProps) {
  const { isFavorited, isBookmarked } = useReviews();
  // Priority: favorited (heart) > saved (bookmark) > default (bean).
  const kind: MarkerKind = isFavorited(cafe.id)
    ? 'favorite'
    : isBookmarked(cafe.id)
    ? 'saved'
    : 'default';
  const palette = MARKER_PALETTE[kind];
  const pillColors = {
    backgroundColor: palette.bg,
    borderColor: palette.border,
  };

  if (zoom === 'far') {
    return (
      <View style={[styles.markerDot, pillColors]}>
        <SvgXml xml={palette.icon} width={14} height={14} />
      </View>
    );
  }

  if (zoom === 'medium') {
    return (
      <View style={[styles.markerPill, pillColors]}>
        <SvgXml xml={palette.icon} width={13} height={13} />
        <Text style={[styles.markerPillText, { color: palette.text }]}>
          {cafe.rating ? cafe.rating.toFixed(1) : '—'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.markerExpanded, pillColors]}>
      <SvgXml xml={palette.icon} width={13} height={13} />
      <Text
        style={[styles.markerExpandedText, { color: palette.text }]}
        numberOfLines={1}
      >
        {cafe.name}
      </Text>
      {cafe.rating ? (
        <Text style={[styles.markerExpandedRating, { color: palette.text }]}>
          {cafe.rating.toFixed(1)}
        </Text>
      ) : null}
    </View>
  );
}

export default function DiscoverScreen() {
  const { addCafe, isBookmarked, isFavorited, userReviews } = useReviews();
  const { profile } = useUserProfile();
  const mapRef = useRef<MapView | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const filtersSheetRef = useRef<FiltersBottomSheetHandle>(null);
  const trackingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapFetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMapFetchRef = useRef<{
    latitude: number;
    longitude: number;
    radius: number;
  } | null>(null);
  // Stable ref to addCafe so the one-time loader doesn't churn.
  const addCafeRef = useRef(addCafe);
  useEffect(() => {
    addCafeRef.current = addCafe;
  }, [addCafe]);

  const [sheetIndex, setSheetIndex] = useState(1);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [zoom, setZoom] = useState<ZoomLevel>('medium');
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isLoadingCafes, setIsLoadingCafes] = useState(false);
  const [cafeError, setCafeError] = useState<string | null>(null);
  const [nearbyCafes, setNearbyCafes] = useState<Cafe[]>([]);
  const [mapCafes, setMapCafes] = useState<Cafe[]>([]);

  const profileLatitude = profile?.location_latitude;
  const profileLongitude = profile?.location_longitude;

  const initialRegion: Region = useMemo(() => {
    const lat =
      typeof profileLatitude === 'number' ? profileLatitude : DEFAULT_LATITUDE;
    const lng =
      typeof profileLongitude === 'number' ? profileLongitude : DEFAULT_LONGITUDE;
    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: DEFAULT_LATITUDE_DELTA,
      longitudeDelta: DEFAULT_LONGITUDE_DELTA,
    };
  }, [profileLatitude, profileLongitude]);

  const [currentRegion, setCurrentRegion] = useState<Region>(initialRegion);

  // Resolve the real device location once when Discover opens. The nearby
  // cafe set is anchored to this coordinate, not to later map panning.
  useEffect(() => {
    let cancelled = false;

    const readCachedCafes = async (
      coords: { latitude: number; longitude: number }
    ): Promise<Cafe[] | null> => {
      try {
        const stored = await AsyncStorage.getItem(NEARBY_CAFES_CACHE_KEY);
        if (!stored) return null;

        const parsed: CachedNearbyCafes = JSON.parse(stored);
        if (
          typeof parsed.latitude !== 'number' ||
          typeof parsed.longitude !== 'number' ||
          !Array.isArray(parsed.cafes)
        ) {
          return null;
        }

        const nzCafes = parsed.cafes.filter(isNzCafe);
        if (nzCafes.length !== parsed.cafes.length) {
          if (nzCafes.length === 0) {
            await AsyncStorage.removeItem(NEARBY_CAFES_CACHE_KEY);
          } else {
            await AsyncStorage.setItem(
              NEARBY_CAFES_CACHE_KEY,
              JSON.stringify({ ...parsed, cafes: nzCafes })
            );
          }
        }

        const moved = approximateDistanceMeters(
          coords.latitude,
          coords.longitude,
          parsed.latitude,
          parsed.longitude
        );
        return moved <= LOCATION_REFRESH_THRESHOLD_METERS
          ? nzCafes.slice(0, NEARBY_CAFE_LIST_LIMIT)
          : null;
      } catch (error) {
        console.warn('Failed to read nearby cafes cache:', error);
        return null;
      }
    };

    const persistNearbyCafes = async (
      coords: { latitude: number; longitude: number },
      cafesToPersist: Cafe[]
    ) => {
      try {
        const nzCafes = cafesToPersist.filter(isNzCafe);
        const payload: CachedNearbyCafes = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          cafes: nzCafes.slice(0, NEARBY_CAFE_LIST_LIMIT),
        };
        await AsyncStorage.setItem(NEARBY_CAFES_CACHE_KEY, JSON.stringify(payload));
      } catch (error) {
        console.warn('Failed to save nearby cafes cache:', error);
      }
    };

    const resolve = async () => {
      setIsLoadingCafes(true);
      setCafeError(null);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setHasLocationPermission(false);
          setCafeError('Location permission is needed to find nearby cafes.');
          return;
        }
        setHasLocationPermission(true);
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        const userRegion = {
          ...coords,
          latitudeDelta: DEFAULT_LATITUDE_DELTA,
          longitudeDelta: DEFAULT_LONGITUDE_DELTA,
        };
        setUserCoords(coords);
        setCurrentRegion(userRegion);
        mapRef.current?.animateToRegion(userRegion, 600);

        const cached = await readCachedCafes(coords);
        if (cancelled) return;
        if (cached) {
          setNearbyCafes(cached);
          setMapCafes((prev) => mergeCafesById(prev, cached));
          cached.forEach((cafe) => addCafeRef.current(cafe));
          return;
        }

        const results = await searchCafesNearbyByCoords(
          coords.latitude,
          coords.longitude,
          NEARBY_CAFE_SEARCH_RADIUS_METERS,
          1
        );
        if (cancelled) return;

        const closestPlaces = [...results]
          .sort(
            (a, b) =>
              getPlaceDistanceMeters(a, coords) - getPlaceDistanceMeters(b, coords)
          )
          .slice(0, NEARBY_CAFE_LIST_LIMIT);
        const converted = await Promise.all(
          closestPlaces.map((place) => convertPlaceToCafe(place))
        );
        const nzConverted = converted.filter(isNzCafe);
        if (cancelled) return;

        setNearbyCafes(nzConverted);
        setMapCafes((prev) => mergeCafesById(prev, nzConverted));
        nzConverted.forEach((cafe) => addCafeRef.current(cafe));
        await persistNearbyCafes(coords, nzConverted);

        if (nzConverted.length === 0) {
          setCafeError('No cafes found nearby.');
        }
      } catch {
        if (!cancelled) {
          setCafeError('Unable to load nearby cafes.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCafes(false);
        }
      }
    };

    resolve();

    return () => {
      cancelled = true;
    };
  }, []);

  // Map markers remain viewport-aware. This does not feed the bottom sheet,
  // which stays anchored to the cached user-location list above.
  useEffect(() => {
    if (mapFetchTimeoutRef.current) {
      clearTimeout(mapFetchTimeoutRef.current);
    }

    mapFetchTimeoutRef.current = setTimeout(async () => {
      const radius = radiusFromRegion(currentRegion);
      const previous = lastMapFetchRef.current;

      if (previous) {
        const moved = approximateDistanceMeters(
          currentRegion.latitude,
          currentRegion.longitude,
          previous.latitude,
          previous.longitude
        );
        const radiusGrew = radius > previous.radius * 1.75;
        const movedFar = moved > previous.radius * 0.65;
        if (!radiusGrew && !movedFar) {
          return;
        }
      }

      lastMapFetchRef.current = {
        latitude: currentRegion.latitude,
        longitude: currentRegion.longitude,
        radius,
      };

      try {
        const results = await searchCafesNearbyByCoords(
          currentRegion.latitude,
          currentRegion.longitude,
          radius,
          radius > 8000 ? 2 : 1
        );
        const converted = await Promise.all(
          results.map((place) => convertPlaceToCafe(place))
        );
        const nzConverted = converted.filter(isNzCafe);
        setMapCafes((prev) => mergeCafesById(prev, nzConverted));
        nzConverted.forEach((cafe) => addCafeRef.current(cafe));
      } catch (error) {
        console.warn('Unable to load map cafes:', error);
        lastMapFetchRef.current = null;
      }
    }, 450);

    return () => {
      if (mapFetchTimeoutRef.current) {
        clearTimeout(mapFetchTimeoutRef.current);
      }
    };
  }, [currentRegion]);

  // Briefly enable tracksViewChanges when the zoom bucket changes so iOS
  // rasterizes the new marker style, then turn it off to keep panning smooth.
  // We deliberately do NOT key this on selection state any more, which used
  // to cause markers to briefly disappear on press.
  useEffect(() => {
    setTracksViewChanges(true);
    if (trackingTimeoutRef.current) {
      clearTimeout(trackingTimeoutRef.current);
    }
    trackingTimeoutRef.current = setTimeout(() => {
      setTracksViewChanges(false);
    }, 350);
    return () => {
      if (trackingTimeoutRef.current) {
        clearTimeout(trackingTimeoutRef.current);
      }
    };
  }, [zoom]);

  // Cafe ids the current user has reviewed — drives the "Already Rated" filter.
  const reviewedCafeIds = useMemo(
    () => new Set(userReviews.map((review) => review.cafeId)),
    [userReviews]
  );

  // Single client-side predicate, parameterised by a filter set so the sheet can
  // count matches for an uncommitted draft and the screen can filter on the
  // committed filters with the same logic.
  const matchesFilters = useCallback(
    (cafe: Cafe, f: Filters) => {
      if (f.openNow && cafe.hours?.openNow !== true) return false;
      if (f.topRated && cafe.rating < 4.5) return false;
      if (f.saved && !isBookmarked(cafe.id)) return false;
      if (f.liked && !isFavorited(cafe.id)) return false;
      if (f.alreadyRated && !reviewedCafeIds.has(cafe.id)) return false;
      if (f.minRating > 0 && cafe.rating < f.minRating) return false;
      if (f.categories.length > 0) {
        const amenities = cafe.amenities ?? [];
        if (!f.categories.every((label) => amenities.includes(label))) {
          return false;
        }
      }
      return true;
    },
    [isBookmarked, isFavorited, reviewedCafeIds]
  );

  const passesFilters = useCallback(
    (cafe: Cafe) => matchesFilters(cafe, filters),
    [matchesFilters, filters]
  );

  // Live count for the sheet's "Show XX Cafes" button, over the list set.
  const countFor = useCallback(
    (f: Filters) => nearbyCafes.filter((cafe) => matchesFilters(cafe, f)).length,
    [nearbyCafes, matchesFilters]
  );

  const listCafes = useMemo(
    () => nearbyCafes.filter(passesFilters).slice(0, NEARBY_CAFE_LIST_LIMIT),
    [nearbyCafes, passesFilters]
  );

  // Nearby/search results only carry a thumbnail (often missing for cache/DB-
  // served cafes), so cards can render a blank image. Lazily pull the real photo
  // for the handful of visible cards via the same details path the cafe page
  // uses. Details are cached server-side, so repeat calls are cheap.
  const enrichedImageIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    const pending = listCafes.filter(
      (cafe) => cafe.place_id && !enrichedImageIdsRef.current.has(cafe.place_id)
    );
    if (pending.length === 0) return;

    (async () => {
      for (const cafe of pending) {
        const placeId = cafe.place_id as string;
        enrichedImageIdsRef.current.add(placeId);
        try {
          const details = await enrichCafeWithDetails(placeId);
          if (cancelled || !details) continue;
          if (!details.image && !details.photos) continue;
          setNearbyCafes((prev) =>
            prev.map((c) =>
              c.id === cafe.id
                ? {
                    ...c,
                    image: details.image || c.image,
                    photos: details.photos || c.photos,
                  }
                : c
            )
          );
        } catch (error) {
          console.warn('Failed to enrich nearby cafe image:', error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listCafes]);

  // Markers are driven by the map viewport and stay independent of the sheet.
  const markerCafes = useMemo(
    () =>
      mapCafes.filter(
        (cafe) =>
          typeof cafe.latitude === 'number' &&
          typeof cafe.longitude === 'number' &&
          passesFilters(cafe)
      ),
    [mapCafes, passesFilters]
  );

  const snapPoints = useMemo(() => ['15%', '30%', '80%'], []);

  const toggleOpenNow = useCallback(() => {
    setFilters((prev) => ({ ...prev, openNow: !prev.openNow }));
  }, []);

  const removeFilter = useCallback(
    (
      key:
        | 'topRated'
        | 'saved'
        | 'liked'
        | 'alreadyRated'
        | 'minRating'
        | 'categories'
    ) => {
      setFilters((prev) => {
        if (key === 'minRating') return { ...prev, minRating: 0 };
        if (key === 'categories') return { ...prev, categories: [] };
        return { ...prev, [key]: false };
      });
    },
    []
  );

  const handleSheetHeaderPress = useCallback(() => {
    const nextIndex = sheetIndex === 2 ? 1 : 2;
    bottomSheetRef.current?.snapToIndex(nextIndex);
  }, [sheetIndex]);

  const handleRegionChangeComplete = useCallback((region: Region) => {
    const nextZoom = zoomLevelForDelta(region.longitudeDelta);
    setZoom((prev) => (prev === nextZoom ? prev : nextZoom));
    setCurrentRegion(region);
  }, []);

  // Marker press now navigates straight to the cafe page. Adding to context
  // first ensures the cafe is available on the detail screen even if it
  // hasn't been picked up via the global cafe list yet.
  const handleMarkerPress = useCallback(
    (cafe: Cafe) => {
      addCafe(cafe);
      router.push(`/cafe/${cafe.id}`);
    },
    [addCafe]
  );

  const handleLocateMe = useCallback(async () => {
    if (userCoords) {
      mapRef.current?.animateToRegion(
        {
          ...userCoords,
          latitudeDelta: 0.012,
          longitudeDelta: 0.006,
        },
        500
      );
      return;
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      setHasLocationPermission(true);
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setUserCoords(coords);
      mapRef.current?.animateToRegion(
        {
          ...coords,
          latitudeDelta: 0.012,
          longitudeDelta: 0.006,
        },
        500
      );
    } catch {
      // Silent: keep current view.
    }
  }, [userCoords]);

  const renderSheetHandle = useCallback(
    () => (
      <TouchableOpacity
        style={styles.sheetHeader}
        activeOpacity={0.85}
        onPress={handleSheetHeaderPress}
      >
        <View style={styles.dragHandle} />
        <View style={styles.sheetTitleRow}>
          <Text style={styles.sheetTitle}>Nearby Cafes</Text>
          <Text style={styles.sheetSubtitle}>
            {listCafes.length} {listCafes.length === 1 ? 'cafe' : 'cafes'}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [listCafes.length, handleSheetHeaderPress]
  );

  const mapProvider = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={mapProvider}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={hasLocationPermission}
          showsMyLocationButton={false}
          showsCompass={false}
          showsPointsOfInterest={false}
          showsBuildings={false}
          showsTraffic={false}
          toolbarEnabled={false}
          customMapStyle={
            Platform.OS === 'android' ? APPLE_LIKE_MAP_STYLE : undefined
          }
          onRegionChangeComplete={handleRegionChangeComplete}
        >
          {markerCafes.map((cafe) => (
            <Marker
              key={cafe.id}
              coordinate={{
                latitude: cafe.latitude as number,
                longitude: cafe.longitude as number,
              }}
              onPress={(e) => {
                e.stopPropagation?.();
                handleMarkerPress(cafe);
              }}
              tracksViewChanges={tracksViewChanges}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <CafeMarkerView cafe={cafe} zoom={zoom} />
            </Marker>
          ))}
        </MapView>

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchContainer}
          onPress={() => router.push('/search-cafes')}
          activeOpacity={0.85}
        >
          <Search size={20} color="#8E8E93" style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>Search Cafes</Text>
          <TouchableOpacity
            style={styles.filtersIconButton}
            onPress={() => filtersSheetRef.current?.open()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <SvgXml xml={SLIDERS_FILTER_SVG} width={20} height={18} color={colors.primary} />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Active filter summary pills */}
        <FilterPillsRow
          filters={filters}
          onOpenSheet={() => filtersSheetRef.current?.open()}
          onToggleOpenNow={toggleOpenNow}
          onRemove={removeFilter}
        />

        {/* Loading / error overlay above the sheet */}
        {(isLoadingCafes || cafeError) && (
          <View style={styles.statusBubble} pointerEvents="none">
            {isLoadingCafes && (
              <>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.statusBubbleText}>Finding cafes…</Text>
              </>
            )}
            {!isLoadingCafes && cafeError && (
              <Text style={styles.statusBubbleText}>{cafeError}</Text>
            )}
          </View>
        )}

        {/* Locate Me button */}
        <TouchableOpacity
          style={styles.locateButton}
          onPress={handleLocateMe}
          activeOpacity={0.85}
        >
          <Navigation2
            size={20}
            color={colors.primary}
            fill={userCoords ? colors.primary : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        index={1}
        snapPoints={snapPoints}
        onChange={setSheetIndex}
        handleComponent={renderSheetHandle}
        backgroundStyle={styles.sheetBackground}
        style={styles.bottomSheet}
        enablePanDownToClose={false}
      >
        <BottomSheetFlatList
          data={listCafes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MapCafeCard cafe={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {isLoadingCafes ? 'Loading cafes…' : 'No cafes here yet'}
              </Text>
              <Text style={styles.emptyText}>
                {isLoadingCafes
                  ? 'Hang tight while we find spots near you.'
                  : cafeError ?? 'Try adjusting your filters.'}
              </Text>
            </View>
          }
        />
      </BottomSheet>

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
  map: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
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
  filtersIconButton: {
    marginLeft: 12,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
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
  bottomSheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  sheetBackground: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D1D1D6',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: 'OtomanopeeOne-Regular',
    color: colors.primary,
  },
  sheetSubtitle: {
    fontSize: 13,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'Lato-Bold',
    color: colors.primary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    textAlign: 'center',
  },
  markerDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  markerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  markerPillText: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
  },
  markerExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  markerExpandedText: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    maxWidth: 120,
  },
  markerExpandedRating: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    opacity: 0.85,
  },
});
