import React, { useState, useRef } from 'react';
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
import { ArrowLeft, Search } from 'lucide-react-native';
import { searchCafesByText, convertPlaceToCafe } from '../services/googlePlaces';
import { useReviews } from '../context/ReviewContext';

export default function SearchCafesScreen() {
  const { addCafe } = useReviews();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer - only call API after 500ms of no typing
    debounceTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchCafesByText(query);
        const convertedCafes = await Promise.all(
          results.slice(0, 20).map(place => convertPlaceToCafe(place))
        );
        setSearchResults(convertedCafes);
      } catch (error) {
        Alert.alert('Search Error', 'Failed to search for cafes. Please try again.');
      }
      setIsSearching(false);
    }, 500);
  };

  const selectCafe = (cafe: any) => {
    // Add cafe to context first (ensures it's available when detail page loads)
    addCafe(cafe);
    // Navigate immediately - detail page will wait for context update
    router.push(`/cafe/${cafe.id}`);
  };

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
        </View>
      </View>

      {searchResults.length === 0 && !isSearching && searchQuery === '' && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Search for a cafe</Text>
          <Text style={styles.emptyText}>Start typing to find cafes near you</Text>
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
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    textAlign: 'center',
  },
});
