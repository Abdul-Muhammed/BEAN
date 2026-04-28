import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Search, X, Clock, MapPin } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { searchCafesByText, convertPlaceToCafe } from '../services/googlePlaces';
import { useReviews } from '../context/ReviewContext';
import BeanLogo from '../components/BeanLogo';

const RECENT_SEARCHES_KEY = '@bean/recent_searches';
const MAX_RECENT_SEARCHES = 8;
const DEFAULT_CAFE_IMAGE =
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800';

interface RecentSearch {
  id: string;
  name: string;
  location: string;
  image?: string;
  rating?: number;
  place_id?: string;
}

export default function SearchCafesScreen() {
  const { addCafe } = useReviews();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
          const parsed: RecentSearch[] = JSON.parse(stored);
          setRecentSearches(parsed);
        }
      } catch (err) {
        console.warn('Failed to load recent searches:', err);
      }
    })();
  }, []);

  const persistRecent = useCallback(async (next: RecentSearch[]) => {
    setRecentSearches(next);
    try {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    } catch (err) {
      console.warn('Failed to save recent searches:', err);
    }
  }, []);

  const addToRecent = useCallback(
    (cafe: {
      id: string;
      name: string;
      location: string;
      image?: string;
      rating?: number;
      place_id?: string;
    }) => {
      const entry: RecentSearch = {
        id: cafe.id,
        name: cafe.name,
        location: cafe.location,
        image: cafe.image,
        rating: cafe.rating,
        place_id: cafe.place_id || cafe.id,
      };
      const filtered = recentSearches.filter((c) => c.id !== entry.id);
      const next = [entry, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      persistRecent(next);
    },
    [recentSearches, persistRecent]
  );

  const removeFromRecent = useCallback(
    (id: string) => {
      const next = recentSearches.filter((c) => c.id !== id);
      persistRecent(next);
    },
    [recentSearches, persistRecent]
  );

  const clearAllRecent = useCallback(() => {
    persistRecent([]);
  }, [persistRecent]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchCafesByText(query);
        const convertedCafes = await Promise.all(
          results.slice(0, 20).map((place) => convertPlaceToCafe(place))
        );
        setSearchResults(convertedCafes);
      } catch (error) {
        Alert.alert('Search Error', 'Failed to search for cafes. Please try again.');
      }
      setIsSearching(false);
    }, 500);
  };

  const selectCafe = (cafe: any) => {
    addCafe(cafe);
    addToRecent(cafe);
    router.push(`/cafe/${cafe.id}`);
  };

  const selectRecent = (entry: RecentSearch) => {
    addToRecent(entry);
    addCafe({
      id: entry.id,
      name: entry.name,
      location: entry.location,
      rating: entry.rating || 0,
      image: entry.image || DEFAULT_CAFE_IMAGE,
      description: entry.location ? `A cafe located at ${entry.location}.` : '',
      reviews: [],
      place_id: entry.place_id || entry.id,
      photos: [entry.image || DEFAULT_CAFE_IMAGE],
    });
    router.push(`/cafe/${entry.id}`);
  };

  const isIdle = searchQuery.trim() === '' && !isSearching && searchResults.length === 0;
  const showRecents = isIdle && recentSearches.length > 0;
  const showEmptyBean = isIdle && recentSearches.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FEFEFE" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Cafes"
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              <X size={18} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showEmptyBean && (
        <View style={styles.emptyState}>
          <BeanLogo width={72} height={120} />
          <Text style={styles.emptyTitle}>No beans searched... yet</Text>
          <Text style={styles.emptyText}>
            Your perfect cup is out there. Start typing to brew up some results.
          </Text>
        </View>
      )}

      {showRecents && (
        <View style={styles.recentsContainer}>
          <View style={styles.recentsHeader}>
            <Text style={styles.recentsTitle}>Recently Searched</Text>
            <TouchableOpacity onPress={clearAllRecent}>
              <Text style={styles.clearAllText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={recentSearches}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.recentItem}
                onPress={() => selectRecent(item)}
              >
                <View style={styles.recentIconWrap}>
                  <Clock size={18} color="#8E8E93" />
                </View>
                <View style={styles.recentInfo}>
                  <Text style={styles.recentName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.recentLocationRow}>
                    <MapPin size={12} color="#8E8E93" />
                    <Text style={styles.recentLocation} numberOfLines={1}>
                      {item.location}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  hitSlop={8}
                  onPress={() => removeFromRecent(item.id)}
                  style={styles.recentRemove}
                >
                  <X size={18} color="#8E8E93" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {searchResults.length === 0 && !isSearching && searchQuery !== '' && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No cafes found</Text>
          <Text style={styles.emptyText}>Try a different search term</Text>
        </View>
      )}

      {isSearching && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Searching...</Text>
        </View>
      )}

      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.cafeItem}
              onPress={() => selectCafe(item)}
            >
              <View style={styles.cafeInfo}>
                <Text style={styles.cafeName}>{item.name}</Text>
                <Text style={styles.cafeLocation}>{item.location}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFEFE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  listContent: {
    paddingVertical: 8,
  },
  cafeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cafeInfo: {
    flex: 1,
  },
  cafeName: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  cafeLocation: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  recentsContainer: {
    flex: 1,
  },
  recentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  recentsTitle: {
    fontSize: 18,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
  },
  clearAllText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  recentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  recentLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recentLocation: {
    fontSize: 13,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    flex: 1,
  },
  recentRemove: {
    padding: 4,
    marginLeft: 8,
  },
});
