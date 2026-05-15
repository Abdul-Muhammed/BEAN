import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  Search, 
  MapPin, 
  Star, 
  Wifi, 
  Bookmark,
  ChevronRight,
  Plus,
  X,
  Car,
} from 'lucide-react-native';
import { 
  Input, 
  InputField, 
  InputSlot, 
  InputIcon,
  Badge,
  BadgeText,
  HStack,
} from '@gluestack-ui/themed';
import * as Location from 'expo-location';
import { useReviews } from '../../context/ReviewContext';
import {
  searchCafesByText,
  searchCafesNearby,
  searchCafesNearbyByCoords,
  convertPlaceToCafe,
} from '../../services/googlePlaces';
import { useUserProfile } from '../../hooks/useUserProfile';
import { colors } from '@/constants/theme';

type FilterType = 'all' | 'open' | 'topRated' | 'wifi' | 'parking';

export default function HomeScreen() {
  const { cafes, addCafe, toggleBookmark, isBookmarked } = useReviews();
  const { profile } = useUserProfile();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const hasLoadedNearby = useRef(false);
  const profileLatitude = profile?.location_latitude;
  const profileLongitude = profile?.location_longitude;
  const profileLocationAddress = profile?.location_address;

  useEffect(() => {
    if (hasLoadedNearby.current) return;
    const hasCoords =
      typeof profileLatitude === 'number' &&
      typeof profileLongitude === 'number';
    if (!hasCoords && !profileLocationAddress) return;

    const resolveCoords = async (): Promise<{ lat: number; lng: number } | null> => {
      if (hasCoords) {
        return {
          lat: profileLatitude as number,
          lng: profileLongitude as number,
        };
      }
      // Fallback for profiles created before coordinates were persisted:
      // ask the device for its current location instead of using Google's
      // Geocoding API (which often returns REQUEST_DENIED if it isn't
      // enabled on the project).
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return null;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        return { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch {
        return null;
      }
    };

    const loadNearbyCafes = async () => {
      setIsLoadingNearby(true);
      setNearbyError(null);
      try {
        const coords = await resolveCoords();
        const results = coords
          ? await searchCafesNearbyByCoords(coords.lat, coords.lng)
          : await searchCafesNearby(profileLocationAddress!);
        const converted = await Promise.all(
          results.slice(0, 15).map(place => convertPlaceToCafe(place))
        );
        converted.forEach(cafe => addCafe(cafe));
        hasLoadedNearby.current = true;
      } catch {
        setNearbyError('Unable to load nearby cafes.');
      }
      setIsLoadingNearby(false);
    };

    loadNearbyCafes();
  }, [addCafe, profileLatitude, profileLocationAddress, profileLongitude]);

  const handleCafeClick = (cafe: any) => {
    addCafe(cafe);
    router.push(`/cafe/${cafe.id}`);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchCafesByText(searchQuery);
      const convertedCafes = await Promise.all(
        results.slice(0, 10).map(place => convertPlaceToCafe(place))
      );
      setSearchResults(convertedCafes);
      setShowSearchResults(true);
    } catch {
      Alert.alert('Search Error', 'Failed to search for cafes. Please try again.');
    }
    setIsSearching(false);
  };

  const clearSearch = () => {
    setShowSearchResults(false);
    setSearchResults([]);
    setSearchQuery('');
  };

  const filterCafes = (allCafes: any[], filter: FilterType) => {
    if (filter === 'all') return allCafes;
    if (filter === 'topRated') return allCafes.filter(cafe => cafe.rating >= 4.5);
    if (filter === 'wifi') return allCafes.filter(cafe => cafe.amenities?.includes('Has WiFi'));
    if (filter === 'parking') return allCafes.filter(cafe => cafe.amenities?.includes('Parking'));
    if (filter === 'open') return allCafes.filter(cafe => cafe.hours?.openNow === true);
    return allCafes;
  };

  const filteredCafes = filterCafes(cafes, activeFilter);
  const displayCafes = showSearchResults ? searchResults : filteredCafes.slice(0, 10);

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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search Section */}
        <View style={styles.searchSection}>
          <Input style={styles.searchInput}>
            <InputSlot style={styles.searchSlot}>
              <InputIcon as={Search} size="md" color="#8E8E93" />
            </InputSlot>
            <InputField
              placeholder="Search Cafes"
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              style={styles.searchField}
            />
            {isSearching ? (
              <InputSlot style={styles.clearSlot}>
                <ActivityIndicator size="small" color="#8E8E93" />
              </InputSlot>
            ) : searchQuery.length > 0 && (
              <InputSlot style={styles.clearSlot} onPress={clearSearch}>
                <X size={18} color="#8E8E93" />
              </InputSlot>
            )}
          </Input>
        </View>

        {/* Explore Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Explore</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <HStack space="sm" style={styles.filterContainer}>
              <TouchableOpacity onPress={() => setActiveFilter(activeFilter === 'open' ? 'all' : 'open')}>
                <Badge style={[styles.filterBadge, activeFilter === 'open' && styles.activeFilter]}>
                  <MapPin size={14} color={activeFilter === 'open' ? '#FFFFFF' : '#666'} style={styles.badgeIcon} />
                  <BadgeText style={activeFilter === 'open' ? styles.activeFilterText : styles.filterText}>Open Now</BadgeText>
                </Badge>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveFilter(activeFilter === 'topRated' ? 'all' : 'topRated')}>
                <Badge style={[styles.filterBadge, activeFilter === 'topRated' && styles.activeFilter]}>
                  <Star size={14} color={activeFilter === 'topRated' ? '#FFFFFF' : '#666'} style={styles.badgeIcon} />
                  <BadgeText style={activeFilter === 'topRated' ? styles.activeFilterText : styles.filterText}>Top Rated</BadgeText>
                </Badge>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveFilter(activeFilter === 'wifi' ? 'all' : 'wifi')}>
                <Badge style={[styles.filterBadge, activeFilter === 'wifi' && styles.activeFilter]}>
                  <Wifi size={14} color={activeFilter === 'wifi' ? '#FFFFFF' : '#666'} style={styles.badgeIcon} />
                  <BadgeText style={activeFilter === 'wifi' ? styles.activeFilterText : styles.filterText}>Has WiFi</BadgeText>
                </Badge>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveFilter(activeFilter === 'parking' ? 'all' : 'parking')}>
                <Badge style={[styles.filterBadge, activeFilter === 'parking' && styles.activeFilter]}>
                  <Plus size={14} color={activeFilter === 'parking' ? '#FFFFFF' : '#666'} style={styles.badgeIcon} />
                  <BadgeText style={activeFilter === 'parking' ? styles.activeFilterText : styles.filterText}>Has Parking</BadgeText>
                </Badge>
              </TouchableOpacity>
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

          {!isLoadingNearby && !nearbyError && displayCafes.length === 0 && !showSearchResults && (
            <View style={styles.loadingContainer}>
              <Text style={styles.emptyText}>No cafes found nearby. Try searching above.</Text>
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
                    <View style={styles.ratingContainer}>
                      <Star size={16} color="#4CAF50" fill="#4CAF50" />
                      <Text style={styles.ratingText}>{cafe.rating.toFixed(1)}</Text>
                    </View>
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
    paddingBottom: 100,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    borderWidth: 0,
  },
  searchSlot: {
    paddingLeft: 16,
  },
  clearSlot: {
    paddingRight: 12,
  },
  searchField: {
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
    paddingLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
    marginBottom: 16,
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
    borderWidth: 1.5,
    borderColor: '#1C1C1E',
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
    color: '#4CAF50',
    marginLeft: 4,
  },
});
