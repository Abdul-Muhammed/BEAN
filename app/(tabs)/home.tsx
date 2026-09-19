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
import {
  attributeRowToCafe,
  getAttributesForCafes,
  getCafesByAttributes,
  type AttributeCafeRow,
  type CafeAttribute,
} from '../../lib/cafeAttributes';
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

/** How many cards a section shows before deferring to Discover. */
const SECTION_CARD_LIMIT = 3;

/** Shared empty array so a chipless card keeps a stable prop identity. */
const EMPTY_ATTRIBUTES: CafeAttribute[] = [];

interface CafeSection {
  /** cafe_categories id, or "near-me" for the leading section. */
  id: string;
  title: string;
  cafes: Cafe[];
}

const BOOKMARK_SAVED_SVG = tintIcon(BOOKMARK_SVG, colors.ink);

function CardTags({
  attributes,
  categoryById,
}: {
  attributes: CafeAttribute[];
  categoryById: Map<string, CafeCategory>;
}) {
  // A cafe nobody has reviewed yet carries no attributes, and shows no chips.
  // The empty View keeps the bean score pushed to the right of the footer row.
  if (attributes.length === 0) return <View />;

  const shown = attributes.slice(0, CARD_TAG_LIMIT);
  const overflow = attributes.length - shown.length;

  return (
    <View style={styles.cardTags}>
      {shown.map(({ attributeId }) => {
        const category = categoryById.get(attributeId);
        return (
          <Tag
            key={attributeId}
            label={category?.label ?? attributeId}
            iconXml={category?.icon_svg_xml}
            size="s"
          />
        );
      })}
      {overflow > 0 && <Tag label={'+' + overflow} size="s" />}
    </View>
  );
}

const HomeCafeCard = React.memo(function HomeCafeCard({
  cafe,
  bookmarked,
  distanceLabel,
  attributes,
  categoryById,
  onPress,
  onToggleBookmark,
}: {
  cafe: Cafe;
  bookmarked: boolean;
  distanceLabel?: string;
  attributes: CafeAttribute[];
  categoryById: Map<string, CafeCategory>;
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
            <CardTags attributes={attributes} categoryById={categoryById} />
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
  // Crowdsourced attributes for everything on screen, and the rows backing the
  // preference sections. Both come from Supabase, never from Google.
  const [cafeAttributes, setCafeAttributes] = useState<Map<string, CafeAttribute[]>>(
    new Map()
  );
  const [attributeRows, setAttributeRows] = useState<AttributeCafeRow[]>([]);
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

  // Attributes for every cafe currently in context, in one query. Refreshed
  // when the set of cafes changes so a newly reviewed cafe picks up its chips.
  const cafeIdsKey = cafes.map((c) => c.id).join(',');
  useEffect(() => {
    let cancelled = false;
    if (cafes.length === 0) {
      setCafeAttributes(new Map());
      return;
    }
    getAttributesForCafes(cafes.map((c) => c.id)).then((map) => {
      if (!cancelled) setCafeAttributes(map);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cafeIdsKey]);

  // One round trip for every preference section, ordered nearest-first with no
  // distance cap, so a Halal cafe across town appears when none is close.
  const preferenceKey = preferenceIds.join(',');
  useEffect(() => {
    let cancelled = false;
    if (preferenceIds.length === 0) {
      setAttributeRows([]);
      return;
    }
    getCafesByAttributes(preferenceIds, {
      latitude: profileLatitude,
      longitude: profileLongitude,
      limitPer: SECTION_CARD_LIMIT,
    }).then((rows) => {
      if (!cancelled) setAttributeRows(rows);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferenceKey, profileLatitude, profileLongitude]);

  const categoryById = useMemo(() => {
    const map = new Map<string, CafeCategory>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

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
        const ids = new Set((cafeAttributes.get(cafe.id) ?? []).map((a) => a.attributeId));
        if (!f.categories.every((id) => ids.has(id))) return false;
      }
      return true;
    },
    [cafeAttributes, isBookmarked, isFavorited]
  );

  const countFor = useCallback(
    (f: Filters) => cafes.filter((cafe) => matchesFilters(cafe, f)).length,
    [cafes, matchesFilters]
  );

  // "Near Me" is the nearby fetch, filtered client-side. The preference
  // sections below it come from Supabase, so adding sections costs no extra
  // Google Places usage.
  const nearMe = useMemo(
    () => cafes.filter((cafe) => matchesFilters(cafe, filters)).slice(0, SECTION_CARD_LIMIT),
    [cafes, filters, matchesFilters]
  );

  const sections: CafeSection[] = useMemo(() => {
    const list: CafeSection[] = [];
    if (nearMe.length > 0) list.push({ id: 'near-me', title: 'Near Me', cafes: nearMe });

    // One row per (attribute, cafe); group them back into a section each, in
    // the order the user's preferences are listed.
    const byAttribute = new Map<string, Cafe[]>();
    attributeRows.forEach((row) => {
      const list = byAttribute.get(row.attribute) ?? [];
      list.push(attributeRowToCafe(row));
      byAttribute.set(row.attribute, list);
    });

    preferenceIds.forEach((id) => {
      const matches = byAttribute.get(id);
      if (!matches || matches.length === 0) return;
      list.push({
        id,
        title: categoryById.get(id)?.label ?? id,
        cafes: matches.slice(0, SECTION_CARD_LIMIT),
      });
    });

    return list;
    // preferenceIds is rebuilt each render from profile.preferences; keying the
    // memo on the joined ids keeps it from invalidating on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attributeRows, categoryById, nearMe, preferenceIds.join(',')]);

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

  const toggleCategory = (id: string) =>
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(id)
        ? prev.categories.filter((c) => c !== id)
        : [...prev.categories, id],
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
            variant={filters.categories.includes(category.id) ? 'filled' : 'outline'}
            onPress={() => toggleCategory(category.id)}
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
                  attributes={cafeAttributes.get(cafe.id) ?? EMPTY_ATTRIBUTES}
                  categoryById={categoryById}
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
