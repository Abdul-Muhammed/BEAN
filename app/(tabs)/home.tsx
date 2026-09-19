import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import * as Location from 'expo-location';

import BeanScore from '@/components/ui/BeanScore';
import CafeCard from '@/components/ui/CafeCard';
import Tag from '@/components/ui/Tag';
import SectionHeader from '@/components/profile/SectionHeader';
import CafeStatusBadges from '@/components/CafeStatusBadges';
import FiltersBottomSheet, {
  type FiltersBottomSheetHandle,
} from '@/components/discover/FiltersBottomSheet';
import { DEFAULT_FILTERS, type Filters } from '@/components/discover/filterTypes';
import { useReviews } from '../../context/ReviewContext';
import {
  searchCafesNearby,
  searchCafesNearbyByCoords,
  convertPlaceToCafe,
} from '../../services/googlePlaces';
import { useUserProfile } from '../../hooks/useUserProfile';
import { getCafeCategories, type CafeCategory } from '../../lib/cafeCategories';
import { buildHomeSections, type CafeSection } from '../../lib/cafeSections';
import { getUnreadFollowCount } from '../../lib/follows';
import { getNotificationsLastSeen } from '../../lib/notifications';
import { approximateDistanceMeters, extractLocation, formatDistance } from '../../lib/geo';
import type { Cafe } from '../../data/mockData';
import { colors, spacing, type } from '@/constants/theme';
import {
  ARROW_RIGHT_SVG,
  BELL_SVG,
  BOOKMARK_SVG,
  SLIDERS_SVG,
  tintIcon,
} from '@/constants/figmaIcons';

// Only refetch the "Near Me" list once the user has moved past this distance
// from where we last loaded, so a focus that didn't move the user is cheap.
// Matches the discover map's refresh threshold.
const LOCATION_REFRESH_THRESHOLD_METERS = 250;

// Minimum interval between unread-notification checks so rapid tab switches
// don't queue redundant network round-trips.
const NOTIFICATIONS_CHECK_INTERVAL_MS = 30_000;

// How many amenity chips a card shows before collapsing the rest into "+N".
const CARD_TAG_LIMIT = 2;

const BOOKMARK_SAVED_SVG = tintIcon(BOOKMARK_SVG, colors.ink);

function CardTags({
  cafe,
  iconFor,
}: {
  cafe: Cafe;
  iconFor: (label: string) => string | null;
}) {
  const amenities = cafe.amenities ?? [];
  if (amenities.length === 0) return <View />;

  const shown = amenities.slice(0, CARD_TAG_LIMIT);
  const overflow = amenities.length - shown.length;

  return (
    <View style={styles.cardTags}>
      {shown.map((amenity) => (
        <Tag key={amenity} label={amenity} iconXml={iconFor(amenity)} size="s" />
      ))}
      {overflow > 0 && <Tag label={'+' + overflow} size="s" />}
    </View>
  );
}

const HomeCafeCard = React.memo(function HomeCafeCard({
  cafe,
  bookmarked,
  distanceLabel,
  iconFor,
  onPress,
  onToggleBookmark,
}: {
  cafe: Cafe;
  bookmarked: boolean;
  distanceLabel?: string;
  iconFor: (label: string) => string | null;
  onPress: (cafe: Cafe) => void;
  onToggleBookmark: (cafe: Cafe) => void;
}) {
  return (
    // The status badge overhangs the card's corner and the card clips its own
    // children, so the badge lives in this wrapper rather than inside the card.
    <View style={styles.cardWrapper}>
      <CafeCard
        name={cafe.name}
        city={extractLocation(cafe.location)}
        distanceLabel={distanceLabel}
        imageUri={cafe.image}
        onPress={() => onPress(cafe)}
        trailing={
          <TouchableOpacity
            onPress={() => onToggleBookmark(cafe)}
            hitSlop={8}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={
              bookmarked ? 'Unsave ' + cafe.name : 'Save ' + cafe.name
            }
          >
            <SvgXml
              xml={bookmarked ? BOOKMARK_SAVED_SVG : BOOKMARK_SVG}
              width={24}
              height={24}
              opacity={bookmarked ? 1 : 0.55}
            />
          </TouchableOpacity>
        }
        footer={
          <>
            <CardTags cafe={cafe} iconFor={iconFor} />
            <BeanScore rating={cafe.rating} />
          </>
        }
      />
      <CafeStatusBadges cafeId={cafe.id} />
    </View>
  );
});

export default function HomeScreen() {
  const { cafes, addCafe, toggleBookmark, isBookmarked, isFavorited } = useReviews();
  const { profile } = useUserProfile();
  const [categories, setCategories] = useState<CafeCategory[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  // Whether there are follow notifications newer than the user's last visit to
  // the Notifications screen, driving the bell dot. Re-checked on focus so it
  // clears after a visit advances the last-seen timestamp.
  const [hasUnread, setHasUnread] = useState(false);
  const filtersSheetRef = useRef<FiltersBottomSheetHandle>(null);
  // Coords of the last successful nearby load, so a re-focus that didn't move
  // the user doesn't trigger a redundant network round-trip.
  const lastFetchCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  // Guards the address-only fallback (no coords to compare against) so it only
  // loads once.
  const hasLoadedAddressRef = useRef(false);
  const profileLatitude = profile?.location_latitude;
  const profileLongitude = profile?.location_longitude;
  const profileLocationAddress = profile?.location_address;

  const loadNearbyCafes = useCallback(async () => {
    const hasProfileCoords =
      typeof profileLatitude === 'number' && typeof profileLongitude === 'number';
    if (!hasProfileCoords && !profileLocationAddress) return;

    // Prefer the device's live location so "Near Me" tracks where the user
    // actually is (matching the Search/Map screens). Fall back to the saved
    // profile coordinates, then to the profile address. We avoid Google's
    // Geocoding API (often REQUEST_DENIED on this project) for the coord path.
    const resolveCoords = async (): Promise<{ lat: number; lng: number } | null> => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          return { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
      } catch {
        // fall through to the saved profile coords
      }
      if (hasProfileCoords) {
        return { lat: profileLatitude as number, lng: profileLongitude as number };
      }
      return null;
    };

    const coords = await resolveCoords();

    // Skip refetching if we already loaded for a nearby location.
    if (coords && lastFetchCoordsRef.current) {
      const moved = approximateDistanceMeters(
        lastFetchCoordsRef.current.lat,
        lastFetchCoordsRef.current.lng,
        coords.lat,
        coords.lng
      );
      if (moved < LOCATION_REFRESH_THRESHOLD_METERS) return;
    }
    if (!coords && hasLoadedAddressRef.current) return;

    setIsLoadingNearby(true);
    setNearbyError(null);
    try {
      const results = coords
        ? await searchCafesNearbyByCoords(coords.lat, coords.lng)
        : await searchCafesNearby(profileLocationAddress!);
      const converted = await Promise.all(
        results.slice(0, 15).map((place) => convertPlaceToCafe(place))
      );
      converted.forEach((cafe) => addCafe(cafe));
      if (coords) lastFetchCoordsRef.current = coords;
      else hasLoadedAddressRef.current = true;
    } catch {
      setNearbyError('Unable to load nearby cafes.');
    }
    setIsLoadingNearby(false);
  }, [addCafe, profileLatitude, profileLongitude, profileLocationAddress]);

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
      if (now - lastUnreadCheckRef.current < NOTIFICATIONS_CHECK_INTERVAL_MS) return;
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

  const iconByLabel = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => {
      if (c.icon_svg_xml) map.set(c.label, c.icon_svg_xml);
    });
    return map;
  }, [categories]);

  const iconFor = useCallback(
    (label: string) => iconByLabel.get(label) ?? null,
    [iconByLabel]
  );

  const distanceFor = useCallback(
    (cafe: Cafe): string | undefined => {
      if (
        typeof profileLatitude !== 'number' ||
        typeof profileLongitude !== 'number' ||
        typeof cafe.latitude !== 'number' ||
        typeof cafe.longitude !== 'number'
      ) {
        return undefined;
      }
      return formatDistance(
        approximateDistanceMeters(
          profileLatitude,
          profileLongitude,
          cafe.latitude,
          cafe.longitude
        )
      );
    },
    [profileLatitude, profileLongitude]
  );

  // Single client-side predicate, parameterised by a filter set so the sheet can
  // count matches for an uncommitted draft while the screen filters on the
  // committed set with identical logic. Mirrors the Discover screen.
  const matchesFilters = useCallback(
    (cafe: Cafe, f: Filters) => {
      if (f.openNow && cafe.hours?.openNow !== true) return false;
      if (f.topRated && cafe.rating < 4.5) return false;
      if (f.saved && !isBookmarked(cafe.id)) return false;
      if (f.liked && !isFavorited(cafe.id)) return false;
      if (f.minRating > 0 && cafe.rating < f.minRating) return false;
      if (f.categories.length > 0) {
        const amenities = cafe.amenities ?? [];
        if (!f.categories.every((label) => amenities.includes(label))) return false;
      }
      return true;
    },
    [isBookmarked, isFavorited]
  );

  const countFor = useCallback(
    (f: Filters) => cafes.filter((cafe) => matchesFilters(cafe, f)).length,
    [cafes, matchesFilters]
  );

  const sections: CafeSection[] = useMemo(() => {
    const filtered = cafes.filter((cafe) => matchesFilters(cafe, filters));
    return buildHomeSections(filtered, categories, preferenceIds);
    // preferenceIds is rebuilt each render from profile.preferences; keying the
    // memo on the joined ids keeps it from invalidating on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cafes, categories, filters, matchesFilters, preferenceIds.join(',')]);

  const handleCafeClick = useCallback(
    (cafe: Cafe) => {
      Keyboard.dismiss();
      addCafe(cafe);
      router.push({ pathname: '/cafe/[id]', params: { id: cafe.id } });
    },
    [addCafe]
  );

  const handleToggleBookmark = useCallback(
    (cafe: Cafe) => {
      addCafe(cafe);
      toggleBookmark(cafe.id);
    },
    [addCafe, toggleBookmark]
  );

  const toggleQuickFilter = (key: 'openNow' | 'topRated') =>
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleCategory = (label: string) =>
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(label)
        ? prev.categories.filter((c) => c !== label)
        : [...prev.categories, label],
    }));

  const preferenceChips = categories.filter((c) => preferenceIds.includes(c.id));

  const listHeader = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={styles.screenTitle}>Explore</Text>
        <TouchableOpacity
          onPress={() => router.push('/notifications')}
          hitSlop={8}
          style={styles.bellButton}
          accessibilityRole="button"
          accessibilityLabel={hasUnread ? 'Notifications, unread' : 'Notifications'}
        >
          <SvgXml xml={BELL_SVG} width={24} height={24} />
          {hasUnread && <View style={styles.bellDot} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        keyboardShouldPersistTaps="handled"
      >
        <Tag
          label="All Filters"
          iconXml={SLIDERS_SVG}
          onPress={() => filtersSheetRef.current?.open()}
          style={styles.allFiltersTag}
        />
        <Tag
          label="Open Now"
          variant={filters.openNow ? 'filled' : 'outline'}
          onPress={() => toggleQuickFilter('openNow')}
        />
        <Tag
          label="Top Rated"
          variant={filters.topRated ? 'filled' : 'outline'}
          onPress={() => toggleQuickFilter('topRated')}
        />
        {preferenceChips.map((category) => (
          <Tag
            key={category.id}
            label={category.label}
            iconXml={category.icon_svg_xml}
            variant={filters.categories.includes(category.label) ? 'filled' : 'outline'}
            onPress={() => toggleCategory(category.label)}
          />
        ))}
      </ScrollView>
    </View>
  );

  const renderStatus = () => {
    if (isLoadingNearby) {
      return (
        <View style={styles.status}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={styles.statusText}>Finding cafes near you...</Text>
        </View>
      );
    }
    if (nearbyError) {
      return (
        <View style={styles.status}>
          <Text style={styles.statusError}>{nearbyError}</Text>
        </View>
      );
    }
    return (
      <View style={styles.status}>
        <Text style={styles.statusText}>No cafes match these filters.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <FlatList
        style={styles.list}
        data={sections}
        keyExtractor={(section) => section.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={renderStatus()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: section }) => (
          <View style={styles.section}>
            <SectionHeader
              title={section.title}
              action={<SvgXml xml={ARROW_RIGHT_SVG} width={16} height={16} />}
              onPressAction={() => router.push('/(tabs)/discover')}
              accessibilityLabel={'See more ' + section.title + ' cafes'}
            />
            <View style={styles.sectionCards}>
              {section.cafes.map((cafe) => (
                <HomeCafeCard
                  key={cafe.id}
                  cafe={cafe}
                  bookmarked={isBookmarked(cafe.id)}
                  distanceLabel={distanceFor(cafe)}
                  iconFor={iconFor}
                  onPress={handleCafeClick}
                  onToggleBookmark={handleToggleBookmark}
                />
              ))}
            </View>
          </View>
        )}
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  header: {
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  screenTitle: {
    ...type.h1,
    flex: 1,
    color: colors.ink,
  },
  bellButton: {
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.badgeRed,
  },
  filterRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  allFiltersTag: {
    paddingHorizontal: spacing.md,
  },
  section: {
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
  },
  sectionCards: {
    gap: spacing.md,
  },
  cardWrapper: {
    // Reserves room for the status badge to overhang the card's top-left corner.
    paddingTop: 12,
    paddingLeft: 12,
    marginLeft: -12,
  },
  cardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  status: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    ...type.body1,
    marginTop: 12,
    color: colors.greyNormal,
    textAlign: 'center',
  },
  statusError: {
    ...type.body1,
    color: colors.error,
    textAlign: 'center',
  },
});
