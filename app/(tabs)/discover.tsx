import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Search, MapPin, Star, Wifi } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import MapCafeCard from '../../components/MapCafeCard';
import { useReviews } from '../../context/ReviewContext';
import { cafes as originalCafes } from '../../data/mockData';

// Default Auckland coordinates
const DEFAULT_LATITUDE = -36.8485;
const DEFAULT_LONGITUDE = 174.7633;

export default function DiscoverScreen() {
  const { cafes } = useReviews();
  const [filters, setFilters] = useState({
    openNow: false,
    topRated: false,
    hasWifi: false,
  });

  // Only show original local cafes (first 5-6), not searched cafes
  const localCafes = useMemo(() => {
    // Get IDs of original local cafes (first 6)
    const originalCafeIds = originalCafes.slice(0, 6).map(c => c.id);
    // Filter to only show cafes that are in the original list
    return cafes.filter(cafe => originalCafeIds.includes(cafe.id));
  }, [cafes]);

  // Filter local cafes based on filters
  const filteredCafes = localCafes.filter((cafe) => {
    return (
      (!filters.openNow || cafe.hours?.openNow === true) &&
      (!filters.topRated || cafe.rating >= 4.5) &&
      (!filters.hasWifi || cafe.amenities?.some((a) => a === 'Has WiFi'))
    );
  });

  // Generate simple map HTML
  const getMapHtml = () => {
    const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <script src="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"></script>
          <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet" />
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; height: 100%; overflow: hidden; }
            #map { width: 100%; height: 100%; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            mapboxgl.accessToken = '${mapboxToken}';
            
            var map = new mapboxgl.Map({
              container: 'map',
              style: 'mapbox://styles/mapbox/streets-v12',
              center: [${DEFAULT_LONGITUDE}, ${DEFAULT_LATITUDE}],
              zoom: 13,
              interactive: true,
              attributionControl: false
            });
            
            map.addControl(new mapboxgl.NavigationControl(), 'top-right');
            
            map.on('load', function() {
              map.resize();
            });
          </script>
        </body>
      </html>
    `;
  };

  const toggleFilter = (filterName: 'openNow' | 'topRated' | 'hasWifi') => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: !prev[filterName],
    }));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FEFEFE" />

      {/* Map */}
      <View style={styles.mapContainer}>
        <WebView
          source={{ html: getMapHtml() }}
          style={styles.map}
          scrollEnabled={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />

        {/* Search Bar - Opens full search page */}
        <TouchableOpacity 
          style={styles.searchContainer}
          onPress={() => router.push('/search-cafes')}
          activeOpacity={0.7}
        >
          <Search size={20} color="#8E8E93" style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>Q Search Cafes</Text>
        </TouchableOpacity>

        {/* Filter Buttons */}
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filters.openNow && styles.filterButtonActive]}
            onPress={() => toggleFilter('openNow')}
          >
            <MapPin
              size={16}
              color={filters.openNow ? '#FFFFFF' : '#4CAF50'}
            />
            <Text
              style={[
                styles.filterButtonText,
                filters.openNow && styles.filterButtonTextActive,
              ]}
            >
              Open Now
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filters.topRated && styles.filterButtonActive]}
            onPress={() => toggleFilter('topRated')}
          >
            <Star
              size={16}
              color={filters.topRated ? '#FFFFFF' : '#D4AF37'}
              fill={filters.topRated ? '#FFFFFF' : 'transparent'}
            />
            <Text
              style={[
                styles.filterButtonText,
                filters.topRated && styles.filterButtonTextActive,
              ]}
            >
              Top Rated
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filters.hasWifi && styles.filterButtonActive]}
            onPress={() => toggleFilter('hasWifi')}
          >
            <Wifi
              size={16}
              color={filters.hasWifi ? '#FFFFFF' : '#007AFF'}
            />
            <Text
              style={[
                styles.filterButtonText,
                filters.hasWifi && styles.filterButtonTextActive,
              ]}
            >
              Has WiFi
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Simple Bottom List (no bottom sheet for now) */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>
          {filteredCafes.length} {filteredCafes.length === 1 ? 'Cafe' : 'Cafes'}
        </Text>
        <FlatList
          data={filteredCafes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MapCafeCard cafe={item} distance="2km" />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFEFE',
  },
  mapContainer: {
    height: 300,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
  filtersContainer: {
    position: 'absolute',
    top: 90,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButtonActive: {
    backgroundColor: '#1C1C1E',
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  listTitle: {
    fontSize: 20,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
});
