import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  MapPin,
  Star,
  Bookmark,
  ChevronRight,
} from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import { CoffeeBean } from '@/components/BeanRating';
import CafeStatusBadges from '@/components/CafeStatusBadges';
import CafeTagChips from '@/components/CafeTagChips';
import {
  Badge,
  BadgeText,
  HStack,
} from '@gluestack-ui/themed';
import { useReviews } from '../../context/ReviewContext';
import {
  searchCafesNearbyByCoords,
  convertPlaceToCafe,
} from '../../services/googlePlaces';
import { useUserProfile } from '../../hooks/useUserProfile';
import {
  AUCKLAND_CBD,
  LOCATION_REFRESH_THRESHOLD_METERS,
  useLocation,
} from '../../hooks/useLocation';
import LocationPrimerSheet from '@/components/LocationPrimerSheet';
import { getCafeCategories, type CafeCategory } from '../../lib/cafeCategories';
import { getUnreadFollowCount } from '../../lib/follows';
import { getNotificationsLastSeen } from '../../lib/notifications';
import { approximateDistanceMeters } from '../../lib/geo';
import { colors } from '@/constants/theme';
import { NOTIFICATIONS_BELL_SVG } from '@/constants/profileIcons';

type FilterType = 'all' | 'open';

// How many top-rated Auckland cafes to show when we have no location.
const FALLBACK_CAFE_COUNT = 10;

// A 5.0 from two ratings is not a top cafe. Rows cached before
// cafes.user_ratings_total existed have no count, so the guard is applied only
// while it still leaves a full list — otherwise it would empty the fallback.
const MIN_RATINGS_FOR_TOP = 20;

function rankTopRated<T extends { rating?: number | null; user_ratings_total?: number | null }>(
  places: T[]
): T[] {
  const byRating = [...places].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const wellRated = byRating.filter(
    (place) => (place.user_ratings_total ?? 0) >= MIN_RATINGS_FOR_TOP
  );
  const source = wellRated.length >= FALLBACK_CAFE_COUNT ? wellRated : byRating;
  return source.slice(0, FALLBACK_CAFE_COUNT);
}

// Minimum interval between unread-notification checks so rapid tab switches
// don't queue redundant network round-trips.
const NOTIFICATIONS_CHECK_INTERVAL_MS = 30_000;

/**
 * Card badges: the cafe's community tags, plus a "Top" badge derived straight
 * from the Google rating.
 *
 * "Top Rated" was previously produced by determineAmenities and read back out
 * of the same array, even though it was never a real category — so it is now
 * computed inline where it is shown rather than pretending to be a tag.
 */
function AmenityTags({ cafe }: { cafe: any }) {
  const isTopRated = cafe.rating >= 4.5;

  return (
    <View style={styles.cafeTagsWrapper}>
      {isTopRated && (
        <Badge style={[styles.amenityTag, { backgroundColor: '#FFF8E1' }]}>
          <Star size={12} color="#D4AF37" fill="#D4AF37" style={styles.tagIcon} />
          <BadgeText style={[styles.amenityTagText, { color: '#D4AF37' }]}>Top</BadgeText>
        </Badge>
      )}
      <CafeTagChips tags={cafe.tags} limit={2} />
    </View>
  );
}

// Memoized so scrolling / unrelated screen state changes don't re-render every
// visible card.
const HomeCafeCard = React.memo(function HomeCafeCard({
  cafe,
  bookmarked,
  onPress,
  onToggleBookmark,
}: {
  cafe: any;
  bookmarked: boolean;
  onPress: (cafe: any) => void;
  onToggleBookmark: (cafe: any) => void;
}) {
  return (
    <View style={styles.cafeCardWrapper}>
      <View style={styles.cafeCard}>
        <TouchableOpacity
          style={styles.cafeCardContent}
          onPress={() => onPress(cafe)}
        >
          <View style={styles.cafeImageContainer}>
            <Image source={{ uri: cafe.image }} style={styles.cafeImage} />
          </View>
          <View style={styles.cafeContent}>
            <View style={styles.cafeHeader}>
              <Text style={styles.cafeName} numberOfLines={1}>{cafe.name}</Text>
              <TouchableOpacity
                style={styles.bookmarkButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(cafe);
                }}
              >
                <Bookmark
                  size={20}
                  color={bookmarked ? '#D4AF37' : '#8E8E93'}
                  fill={bookmarked ? '#D4AF37' : 'transparent'}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.cafeLocation}>
              <MapPin size={14} color="#8E8E93" />
              <Text style={styles.locationText} numberOfLines={1}>{cafe.location}</Text>
            </View>
            <View style={styles.cafeFooter}>
              <AmenityTags cafe={cafe} />
              {cafe.rating ? (
                <View style={styles.ratingContainer}>
                  <CoffeeBean size={16} />
                  <Text style={styles.ratingText}>{cafe.rating.toFixed(1)}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <CafeStatusBadges cafeId={cafe.id} />
    </View>
  );
});

export default function HomeScreen() {
  const { cafes, addCafe, toggleBookmark, isBookmarked } = useReviews();
  const { profile } = useUserProfile();
  const {
    coords,
    isFallback,
    shouldShowPrimer,
    requestPermission,
    dismissPrimer,
  } = useLocation();
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [categories, setCategories] = useState<CafeCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  // Ids from the most recent fetch, in the order the server returned them.
  // `cafes` from ReviewContext accumulates every cafe the app has ever seen, so
  // rendering it directly would dilute "top 10 in Auckland" with unrelated rows.
  const [nearbyIds, setNearbyIds] = useState<string[]>([]);
  // Whether there are follow notifications newer than the user's last visit to
  // the Notifications screen, driving the bell dot. Re-checked on focus so it
  // clears after a visit advances the last-seen timestamp.
  const [hasUnread, setHasUnread] = useState(false);
  // Coords of the last successful nearby load, so a re-focus that didn't move
  // the user doesn't trigger a redundant network round-trip.
  const lastFetchCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  // Whether that last fetch was the Auckland fallback. Without this, a user
  // standing in the CBD who grants permission stays on the rating-sorted
  // fallback list, because the distance guard sees they barely moved.
  const lastFetchWasFallbackRef = useRef<boolean | null>(null);
  // Which category the last fetch asked for, so switching chips always
  // re-queries even though the user has not moved.
  const lastFetchCategoryRef = useRef<string | null | undefined>(undefined);

  const loadNearbyCafes = useCallback(async () => {
    // With no coordinates we still show something useful: the best-rated cafes
    // around the Auckland CBD, which is where this app's users are.
    const target = coords ?? AUCKLAND_CBD;
    const usingFallback = coords === null;

    // Skip refetching if we already loaded for somewhere close by — unless we
    // just crossed between fallback and real-location mode, which changes how
    // the list is ranked regardless of distance.
    const modeChanged = lastFetchWasFallbackRef.current !== usingFallback;
    const categoryChanged = lastFetchCategoryRef.current !== selectedCategoryId;
    if (lastFetchCoordsRef.current && !modeChanged && !categoryChanged) {
      const moved = approximateDistanceMeters(
        lastFetchCoordsRef.current.lat,
        lastFetchCoordsRef.current.lng,
        target.latitude,
        target.longitude
      );
      if (moved < LOCATION_REFRESH_THRESHOLD_METERS) return;
    }

    setIsLoadingNearby(true);
    setNearbyError(null);
    try {
      const results = await searchCafesNearbyByCoords(
        target.latitude,
        target.longitude,
        undefined,
        undefined,
        selectedCategoryId ? [selectedCategoryId] : undefined
      );

      // The nearby endpoint returns distance-ordered results, which is what we
      // want when the user is actually here. In fallback mode distance from a
      // CBD point the user has no relationship with is meaningless, so rank by
      // rating instead and keep it to a short, curated list.
      const ranked = usingFallback
        ? rankTopRated(results)
        : results.slice(0, 15);

      const converted = await Promise.all(
        ranked.map((place) => convertPlaceToCafe(place))
      );
      converted.forEach((cafe) => addCafe(cafe));
      setNearbyIds(converted.map((cafe) => cafe.id));
      lastFetchCoordsRef.current = { lat: target.latitude, lng: target.longitude };
      lastFetchWasFallbackRef.current = usingFallback;
      lastFetchCategoryRef.current = selectedCategoryId;
    } catch {
      setNearbyError('Unable to load nearby cafes.');
    }
    setIsLoadingNearby(false);
  }, [addCafe, coords, selectedCategoryId]);

  // Re-check location each time the Home tab gains focus so the list refreshes
  // when the user has moved, without reloading on every render.
  useFocusEffect(
    useCallback(() => {
      loadNearbyCafes();
    }, [loadNearbyCafes])
  );

  // Refresh the bell's unread state on focus. Returning from /notifications
  // (which stamps last-seen) re-runs this and clears the dot. Throttled so
  // rapid tab switches within the interval don't re-query.
  const lastUnreadCheckRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastUnreadCheckRef.current < NOTIFICATIONS_CHECK_INTERVAL_MS) {
        return;
      }
      lastUnreadCheckRef.current = now;
      let active = true;
      (async () => {
        try {
          const lastSeen = await getNotificationsLastSeen();
          const count = await getUnreadFollowCount(lastSeen);
          if (active) setHasUnread(count > 0);
        } catch {
          // Non-fatal: leave the dot in its current state.
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  // Load the category metadata (label + icon) so we can render a pill for each
  // of the user's onboarding selections stored in profiles.preferences.
  useEffect(() => {
    let cancelled = false;
    getCafeCategories()
      .then((cats) => {
        if (!cancelled) setCategories(cats);
      })
      .catch((err) => {
        console.warn('Failed to load cafe categories:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const preferenceIds: string[] = Array.isArray(profile?.preferences)
    ? profile!.preferences
    : [];
  const selectedCategories = categories.filter((cat) =>
    preferenceIds.includes(cat.id)
  );
  const selectedCategoryLabel = selectedCategoryId
    ? (categories.find((cat) => cat.id === selectedCategoryId)?.label ??
      selectedCategoryId)
    : null;

  const handleCafeClick = useCallback(
    (cafe: any) => {
      Keyboard.dismiss();
      addCafe(cafe);
      router.push(`/cafe/${cafe.id}`);
    },
    [addCafe]
  );

  const handleToggleBookmark = useCallback(
    (cafe: any) => {
      addCafe(cafe);
      toggleBookmark(cafe.id);
    },
    [addCafe, toggleBookmark]
  );

  const displayCafes = useMemo(() => {
    // Render the last fetch's results, in its order. Falls back to the whole
    // context list only before the first fetch resolves.
    const byId = new Map(cafes.map((cafe) => [cafe.id, cafe]));
    const ordered = nearbyIds
      .map((id) => byId.get(id))
      .filter((cafe): cafe is (typeof cafes)[number] => !!cafe);
    const source = ordered.length > 0 ? ordered : cafes;

    const filtered =
      activeFilter === 'open'
        ? source.filter((cafe) => cafe.hours?.openNow === true)
        : source;
    return filtered.slice(0, FALLBACK_CAFE_COUNT);
  }, [cafes, nearbyIds, activeFilter]);

  const handleEnableLocation = useCallback(async () => {
    setIsRequestingLocation(true);
    await requestPermission();
    setIsRequestingLocation(false);
  }, [requestPermission]);

  // Everything above the cafe cards renders as the FlatList header so the
  // whole page scrolls together while the cards stay virtualized.
  const listHeader = (
    <>
      {/* Explore Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Explore</Text>
            <TouchableOpacity
              onPress={() => router.push('/notifications')}
              hitSlop={8}
              style={styles.bellButton}
            >
              <SvgXml xml={NOTIFICATIONS_BELL_SVG} width={20} height={22} />
              {hasUnread && <View style={styles.bellDot} />}
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <HStack space="sm" style={styles.filterContainer}>
              <TouchableOpacity onPress={() => setActiveFilter(activeFilter === 'open' ? 'all' : 'open')}>
                <Badge style={[styles.filterBadge, activeFilter === 'open' && styles.activeFilter]}>
                  <MapPin size={14} color={activeFilter === 'open' ? '#FFFFFF' : '#666'} style={styles.badgeIcon} />
                  <BadgeText style={activeFilter === 'open' ? styles.activeFilterText : styles.filterText}>Open Now</BadgeText>
                </Badge>
              </TouchableOpacity>
              {selectedCategories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() =>
                      setSelectedCategoryId(isSelected ? null : cat.id)
                    }
                  >
                    <Badge style={[styles.filterBadge, isSelected && styles.activeFilter]}>
                      <SvgXml xml={cat.icon_svg_xml} width={14} height={14} style={styles.badgeIcon} />
                      <BadgeText style={isSelected ? styles.activeFilterText : styles.filterText}>{cat.label}</BadgeText>
                    </Badge>
                  </TouchableOpacity>
                );
              })}
            </HStack>
          </ScrollView>
        </View>

      {/* Near Me Section header + status states; the cards themselves are the
          FlatList items below. */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {isFallback ? 'Top Cafes in Auckland' : 'Near Me'}
        </Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/discover')}>
          <ChevronRight size={20} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      {isFallback && (
        <TouchableOpacity
          style={styles.locationBanner}
          onPress={handleEnableLocation}
          activeOpacity={0.85}
        >
          <MapPin size={16} color={colors.ink} />
          <Text style={styles.locationBannerText}>
            Turn on location to see cafes near you
          </Text>
          <ChevronRight size={16} color={colors.mutedText} />
        </TouchableOpacity>
      )}

      {isLoadingNearby && displayCafes.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1C1C1E" />
          <Text style={styles.loadingText}>Finding cafes near you...</Text>
        </View>
      )}

      {nearbyError && displayCafes.length === 0 && (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{nearbyError}</Text>
        </View>
      )}

      {!isLoadingNearby && !nearbyError && displayCafes.length === 0 && (
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>
            {selectedCategoryLabel
              ? `No cafes tagged ${selectedCategoryLabel} ${
                  isFallback ? 'in Auckland' : 'near you'
                } yet — be the first to review one.`
              : isFallback
                ? 'No cafes found.'
                : 'No cafes found nearby.'}
          </Text>
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <FlatList
        style={styles.scrollView}
        data={displayCafes}
        keyExtractor={(cafe) => cafe.id}
        renderItem={({ item }) => (
          <HomeCafeCard
            cafe={item}
            bookmarked={isBookmarked(item.id)}
            onPress={handleCafeClick}
            onToggleBookmark={handleToggleBookmark}
          />
        )}
        ListHeaderComponent={listHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      />

      <LocationPrimerSheet
        visible={shouldShowPrimer}
        requesting={isRequestingLocation}
        onEnable={handleEnableLocation}
        onDismiss={dismissPrimer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.creamBorder,
  },
  locationBannerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: colors.ink,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  sectionTitleStandalone: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  bellButton: {
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2574C',
    borderWidth: 1,
    borderColor: colors.background,
  },
  filterScroll: {
    paddingLeft: 20,
  },
  filterContainer: {
    paddingRight: 20,
  },
  filterBadge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeFilter: {
    backgroundColor: '#1C1C1E',
    borderColor: '#1C1C1E',
  },
  badgeIcon: {
    marginRight: 4,
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#666',
  },
  activeFilterText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#FFFFFF',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#FF3B30',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    textAlign: 'center',
  },
  // Padding reserves room for the status badge to overhang the card's corner.
  // The card clips its own children, so the badge has to live out here. The
  // 8+12 split keeps the card's left edge at the original 20px.
  cafeCardWrapper: {
    marginLeft: 8,
    marginRight: 20,
    paddingTop: 12,
    paddingLeft: 12,
    marginBottom: 4,
  },
  cafeCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E3E3E3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cafeImageContainer: {
    width: 100,
    height: 120,
  },
  cafeImage: {
    width: '100%',
    height: '100%',
  },
  cafeCardContent: {
    flexDirection: 'row',
  },
  cafeContent: {
    flex: 1,
    padding: 12,
    paddingLeft: 16,
  },
  cafeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cafeName: {
    fontSize: 16,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
    flex: 1,
  },
  bookmarkButton: {
    padding: 4,
  },
  cafeLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    marginLeft: 4,
    flex: 1,
  },
  cafeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cafeTagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  amenityTag: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  amenityTagText: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
  },
  countTag: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagIcon: {
    marginRight: 4,
  },
  countTagText: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
    marginLeft: 4,
  },
});
