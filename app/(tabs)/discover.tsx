import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Search, MapPin, Star, Wifi } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import MapCafeCard from '../../components/MapCafeCard';
import { useReviews } from '../../context/ReviewContext';
import { colors } from '@/constants/theme';

// Default Auckland coordinates
const DEFAULT_LATITUDE = -36.8485;
const DEFAULT_LONGITUDE = 174.7633;

export default function DiscoverScreen() {
  const { cafes } = useReviews();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [sheetIndex, setSheetIndex] = useState(1);
  const [filters, setFilters] = useState({
    openNow: false,
    topRated: false,
    hasWifi: false,
  });

  const localCafes = useMemo(() => cafes, [cafes]);
  const snapPoints = useMemo(() => ['15%', '30%', '80%'], []);

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

  const handleSheetHeaderPress = useCallback(() => {
    const nextIndex = sheetIndex === 2 ? 1 : 2;
    bottomSheetRef.current?.snapToIndex(nextIndex);
  }, [sheetIndex]);

  const renderSheetHandle = useCallback(
    () => (
      <TouchableOpacity
        style={styles.sheetHeader}
        activeOpacity={0.85}
        onPress={handleSheetHeaderPress}
      >
        <View style={styles.dragHandle} />
        <View style={styles.sheetTitleRow}>
          <Text style={styles.sheetTitle}>Recent Cafes</Text>
          <Text style={styles.sheetSubtitle}>
            {filteredCafes.length} {filteredCafes.length === 1 ? 'cafe' : 'cafes'} nearby
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [filteredCafes.length, handleSheetHeaderPress]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

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
          data={filteredCafes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MapCafeCard cafe={item} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No cafes found</Text>
              <Text style={styles.emptyText}>Try adjusting your filters.</Text>
            </View>
          }
        />
      </BottomSheet>
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
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
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
  bottomSheet: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -6,
    },
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
    color: '#1C1C1E',
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
    color: '#1C1C1E',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    textAlign: 'center',
  },
});
