import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
  Wifi,
  Bookmark,
  ChevronRight,
  Car,
} from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import { CoffeeBean } from '@/components/BeanRating';
import {
  Badge,
  BadgeText,
  HStack,
} from '@gluestack-ui/themed';
import * as Location from 'expo-location';
import { useReviews } from '../../context/ReviewContext';
import {
  searchCafesNearby,
  searchCafesNearbyByCoords,
  convertPlaceToCafe,
} from '../../services/googlePlaces';
import { useUserProfile } from '../../hooks/useUserProfile';
import { getCafeCategories, type CafeCategory } from '../../lib/cafeCategories';
import { approximateDistanceMeters } from '../../lib/geo';
import { colors } from '@/constants/theme';

type FilterType = 'all' | 'open';

// Only refetch the "Near Me" list once the user has moved past this distance
// from where we last loaded, so a focus that didn't move the user is cheap.
// Matches the discover map's refresh threshold.
const LOCATION_REFRESH_THRESHOLD_METERS = 250;

export default function HomeScreen() {
  const { cafes, addCafe, toggleBookmark, isBookmarked } = useReviews();
  const { profile } = useUserProfile();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [categories, setCategories] = useState<CafeCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
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
      typeof profileLatitude === 'number' &&
      typeof profileLongitude === 'number';
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
        return {
          lat: profileLatitude as number,
          lng: profileLongitude as number,
        };
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
        results.slice(0, 15).map(place => convertPlaceToCafe(place))
      );
      converted.forEach(cafe => addCafe(cafe));
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

  const handleCafeClick = (cafe: any) => {
    Keyboard.dismiss();
    addCafe(cafe);
    router.push(`/cafe/${cafe.id}`);
  };

  const filterCafes = (allCafes: any[], filter: FilterType) => {
    if (filter === 'open') return allCafes.filter(cafe => cafe.hours?.openNow === true);
    return allCafes;
  };

  const filteredCafes = filterCafes(cafes, activeFilter);
  const displayCafes = filteredCafes.slice(0, 10);

  const renderAmenityTags = (cafe: any) => {
    const tags: { label: string; icon: any; bgColor: string; textColor: string; iconColor: string }[] = [];

    if (cafe.amenities?.includes('Has WiFi')) {
      tags.push({ label: 'WiFi', icon: Wifi, bgColor: '#E3F2FD', textColor: '#007AFF', iconColor: '#007AFF' });
    }
    if (cafe.amenities?.includes('Top Rated') || cafe.rating >= 4.5) {
      tags.push({ label: 'Top', icon: Star, bgColor: '#FFF8E1', textColor: '#D4AF37', iconColor: '#D4AF37' });
    }
    if (cafe.amenities?.includes('Parking')) {
      tags.push({ label: 'Parking', icon: Car, bgColor: '#E8F5E9', textColor: '#4CAF50', iconColor: '#4CAF50' });
    }

    const extraCount = (cafe.amenities?.length || 0) - tags.length;

    return (
      <View style={styles.cafeTagsWrapper}>
        {tags.map((tag, i) => (
          <Badge key={i} style={[styles.amenityTag, { backgroundColor: tag.bgColor }]}>  
            <tag.icon size={12} color={tag.iconColor} style={styles.tagIcon} />
            <BadgeText style={[styles.amenityTagText, { color: tag.textColor }]}>{tag.label}</BadgeText>
          </Badge>
        ))}
        {extraCount > 0 && (
          <Badge style={styles.countTag}>
            <BadgeText style={styles.countTagText}>+{extraCount}</BadgeText>
          </Badge>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Explore Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.sectionTitleStandalone]}>Explore</Text>
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

        {/* Near Me Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Near Me</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/discover')}>
              <ChevronRight size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>

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
              <Text style={styles.emptyText}>No cafes found nearby.</Text>
            </View>
          )}
          
          {displayCafes.map((cafe) => (
            <View key={cafe.id} style={styles.cafeCard}>
              <TouchableOpacity
                style={styles.cafeCardContent}
                onPress={() => handleCafeClick(cafe)}
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
                        addCafe(cafe);
                        toggleBookmark(cafe.id);
                      }}
                    >
                      <Bookmark
                        size={20}
                        color={isBookmarked(cafe.id) ? '#D4AF37' : '#8E8E93'}
                        fill={isBookmarked(cafe.id) ? '#D4AF37' : 'transparent'}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.cafeLocation}>
                    <MapPin size={14} color="#8E8E93" />
                    <Text style={styles.locationText} numberOfLines={1}>{cafe.location}</Text>
                  </View>
                  <View style={styles.cafeFooter}>
                    {renderAmenityTags(cafe)}
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
          ))}
        </View>

      </ScrollView>
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
  cafeCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
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
