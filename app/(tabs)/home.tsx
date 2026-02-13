import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Alert,
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
  Plus
} from 'lucide-react-native';
import { 
  Input, 
  InputField, 
  InputSlot, 
  InputIcon,
  Button,
  ButtonText,
  Badge,
  BadgeText,
  HStack,
  VStack
} from '@gluestack-ui/themed';
import { useReviews } from '../../context/ReviewContext';
import { searchCafesByText, convertPlaceToCafe } from '../../services/googlePlaces';

type FilterType = 'all' | 'open' | 'topRated' | 'wifi' | 'parking';

export default function HomeScreen() {
  const { cafes, recentActivity, addCafe, toggleBookmark, isBookmarked, loading } = useReviews();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const handleCafeClick = (cafe: any) => {
    addCafe(cafe);
    router.push(`/cafe/${cafe.id}`);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchCafesByText(searchQuery);
      const convertedCafes = await Promise.all(
        results.slice(0, 10).map(place => convertPlaceToCafe(place))
      );
      setSearchResults(convertedCafes);
      setShowSearchResults(true);
    } catch (error) {
      Alert.alert('Search Error', 'Failed to search for cafes. Please try again.');
    }
    setIsSearching(false);
  };

  const clearSearch = () => {
    setShowSearchResults(false);
    setSearchResults([]);
    setSearchQuery('');
  };

  const filterCafes = (cafes: any[], filter: FilterType) => {
    if (filter === 'all') return cafes;
    if (filter === 'topRated') return cafes.filter(cafe => cafe.rating >= 4.5);
    if (filter === 'wifi') return cafes;
    if (filter === 'parking') return cafes;
    if (filter === 'open') return cafes;
    return cafes;
  };

  const filteredCafes = filterCafes(cafes, activeFilter);
  const displayCafes = showSearchResults ? searchResults : filteredCafes.slice(0, 3);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FEFEFE" />
      
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
          </Input>
          {showSearchResults && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearSearchButton}>
              <Text style={styles.clearSearchText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Explore Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Explore</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <HStack space="sm" style={styles.filterContainer}>
              <TouchableOpacity onPress={() => setActiveFilter('open')}>
                <Badge style={[styles.filterBadge, activeFilter === 'open' && styles.activeFilter]}>
                  <MapPin size={14} color={activeFilter === 'open' ? '#FFFFFF' : '#666'} style={styles.badgeIcon} />
                  <BadgeText style={activeFilter === 'open' ? styles.activeFilterText : styles.filterText}>Open Now</BadgeText>
                </Badge>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveFilter('topRated')}>
                <Badge style={[styles.filterBadge, activeFilter === 'topRated' && styles.activeFilter]}>
                  <Star size={14} color={activeFilter === 'topRated' ? '#FFFFFF' : '#666'} style={styles.badgeIcon} />
                  <BadgeText style={activeFilter === 'topRated' ? styles.activeFilterText : styles.filterText}>Top Rated</BadgeText>
                </Badge>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveFilter('wifi')}>
                <Badge style={[styles.filterBadge, activeFilter === 'wifi' && styles.activeFilter]}>
                  <Wifi size={14} color={activeFilter === 'wifi' ? '#FFFFFF' : '#666'} style={styles.badgeIcon} />
                  <BadgeText style={activeFilter === 'wifi' ? styles.activeFilterText : styles.filterText}>Has WiFi</BadgeText>
                </Badge>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveFilter('parking')}>
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
                    <Text style={styles.cafeName}>{cafe.name}</Text>
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
                  <Text style={styles.locationText}>Auckland • 2km</Text>
                </View>
                <View style={styles.cafeFooter}>
                  <View style={styles.cafeTagsWrapper}>
                    <Badge style={styles.wifiTag}>
                      <Wifi size={12} color="#007AFF" style={styles.tagIcon} />
                      <BadgeText style={styles.wifiTagText}>WiFi</BadgeText>
                    </Badge>
                    <Badge style={styles.ratedTag}>
                      <Star size={12} color="#D4AF37" style={styles.tagIcon} />
                      <BadgeText style={styles.ratedTagText}>Top</BadgeText>
                    </Badge>
                    <Badge style={styles.countTag}>
                      <BadgeText style={styles.countTagText}>+2</BadgeText>
                    </Badge>
                  </View>
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

        {/* Recent Activity Section */}
        {recentActivity.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>

            {recentActivity.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={styles.activityCard}
                onPress={() => router.push(`/cafe/${activity.cafeId}`)}
              >
                <View style={styles.activityHeader}>
                  <Image
                    source={{ uri: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2' }}
                    style={styles.userAvatar}
                  />
                  <View style={styles.activityInfo}>
                    <Text style={styles.userName}>You</Text>
                    <Text style={styles.activityMeta}>{activity.cafeName} • {activity.date}</Text>
                  </View>
                  <TouchableOpacity style={styles.bookmarkButton}>
                    <Bookmark size={20} color="#8E8E93" />
                  </TouchableOpacity>
                </View>

                {activity.text && (
                  <Text style={styles.activityText} numberOfLines={2}>{activity.text}</Text>
                )}

                <View style={styles.activityTags}>
                  <HStack space="xs">
                    {activity.attributes && activity.attributes.slice(0, 2).map((tag, index) => (
                      <Badge key={index} style={styles.activityTag}>
                        <BadgeText style={styles.activityTagText}>{tag}</BadgeText>
                      </Badge>
                    ))}
                    {activity.attributes && activity.attributes.length > 2 && (
                      <Badge style={styles.countTag}>
                        <BadgeText style={styles.countTagText}>+{activity.attributes.length - 2}</BadgeText>
                      </Badge>
                    )}
                  </HStack>
                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        color={star <= activity.rating ? '#4CAF50' : '#E5E5EA'}
                        fill={star <= activity.rating ? '#4CAF50' : 'transparent'}
                      />
                    ))}
                  </View>
                </View>

                {activity.photos && activity.photos.length > 0 && (
                  <Image source={{ uri: activity.photos[0] }} style={styles.activityImage} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFEFE',
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
  searchField: {
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
    paddingLeft: 8,
  },
  clearSearchButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearSearchText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#D4AF37',
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
    backgroundColor: '#FFFFFF',
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
  cafeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#1C1C1E',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  wifiTag: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratedTag: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
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
  wifiTagText: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    color: '#007AFF',
  },
  ratedTagText: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    color: '#D4AF37',
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
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  activityMeta: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
  activityText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  activityTags: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityTag: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activityTagText: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    color: '#666',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  activityImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
});