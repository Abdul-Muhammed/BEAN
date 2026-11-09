import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  FlatList,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  convertPlaceToCafe,
  isNzCafe,
  DEFAULT_CAFE_IMAGE,
} from '../services/googlePlaces';
import { useReviews } from '../context/ReviewContext';
import { useLocation } from '../hooks/useLocation';
import { useCafeSearch, MIN_QUERY_LENGTH } from '../hooks/useCafeSearch';
import { cardToCafe } from '../lib/mapSearch';
import { extractLocation } from '../lib/geo';
import BeanLogo from '../components/BeanLogo';
import type { Cafe } from '../data/mockData';
import { colors, fonts, radius, softShadow, spacing, type } from '@/constants/theme';
import { CHEVRON_LEFT_14_SVG, CLOSE_14_SVG } from '@/constants/figmaIcons';

const RECENT_SEARCHES_KEY = '@bean/recent_searches';
const MAX_RECENT_SEARCHES = 8;

/** Figma row: a 40pt thumbnail with 8pt vertical padding. */
const ROW_HEIGHT = 56;

interface RecentSearch {
  id: string;
  name: string;
  location: string;
  image?: string;
  rating?: number;
  place_id?: string;
}

const getRowLayout = (_: unknown, index: number) => ({
  length: ROW_HEIGHT,
  offset: ROW_HEIGHT * index,
  index,
});

/**
 * One search row per Figma "Search / Recent" and "Typing": a 40pt rounded
 * thumbnail, the cafe name in Title 1 and its suburb in Footnote 1. A cafe
 * without a real photo gets the same ink-and-bean tile the cafe cards use,
 * rather than the stock placeholder photo.
 */
const SearchRow = React.memo(function SearchRow({
  name,
  location,
  image,
  onPress,
  onRemove,
}: {
  name: string;
  location: string;
  image?: string;
  onPress: () => void;
  onRemove?: () => void;
}) {
  const hasPhoto = !!image && image !== DEFAULT_CAFE_IMAGE;
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={name}
    >
      {hasPhoto ? (
        <Image
          source={{ uri: image }}
          style={styles.thumb}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={image}
          transition={150}
        />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <BeanLogo width={10} height={17} color={colors.background} />
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {name}
        </Text>
        {!!location && (
          <Text style={styles.rowLocation} numberOfLines={1}>
            {extractLocation(location)}
          </Text>
        )}
      </View>
      {onRemove && (
        <TouchableOpacity
          hitSlop={10}
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={'Remove ' + name + ' from recent searches'}
        >
          <SvgXml xml={CLOSE_14_SVG} width={14} height={14} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

export default function SearchCafesScreen() {
  const { addCafe } = useReviews();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isReviewMode = mode === 'review';
  const { coords } = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  const { results, googleResults, isSearching, isSearchingMore } = useCafeSearch(
    searchQuery,
    coords
  );
  // Database matches when there are any; otherwise whatever the one-off Google
  // lookup found for this query.
  const searchResults = useMemo(
    () =>
      results.length > 0
        ? results.map(cardToCafe)
        : googleResults.map((place) => convertPlaceToCafe(place)).filter(isNzCafe),
    [results, googleResults]
  );

  // Load recent searches on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
          const parsed: RecentSearch[] = JSON.parse(stored);
          const nzOnly = parsed.filter(isNzCafe).slice(0, MAX_RECENT_SEARCHES);
          setRecentSearches(nzOnly);
          if (nzOnly.length !== parsed.length) {
            await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nzOnly));
          }
        }
      } catch (err) {
        console.warn('Failed to load recent searches:', err);
      }
    })();
  }, []);

  // Functional updates keep these callbacks stable, so the memoized rows don't
  // re-render every time the recents list changes.
  const updateRecent = useCallback((update: (prev: RecentSearch[]) => RecentSearch[]) => {
    setRecentSearches((prev) => {
      const next = update(prev);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)).catch((err) =>
        console.warn('Failed to save recent searches:', err)
      );
      return next;
    });
  }, []);

  const addToRecent = useCallback(
    (cafe: RecentSearch) => {
      if (!isNzCafe(cafe)) return;
      const entry: RecentSearch = {
        id: cafe.id,
        name: cafe.name,
        location: cafe.location,
        image: cafe.image,
        rating: cafe.rating,
        place_id: cafe.place_id || cafe.id,
      };
      updateRecent((prev) =>
        [entry, ...prev.filter((c) => c.id !== entry.id)].slice(0, MAX_RECENT_SEARCHES)
      );
    },
    [updateRecent]
  );

  const removeFromRecent = useCallback(
    (id: string) => updateRecent((prev) => prev.filter((c) => c.id !== id)),
    [updateRecent]
  );

  const clearAllRecent = useCallback(() => updateRecent(() => []), [updateRecent]);

  const openPicked = useCallback(
    (cafe: { id: string; name: string; image?: string }) => {
      if (isReviewMode) {
        router.push({
          pathname: '/(tabs)/add-review',
          params: { cafeId: cafe.id, cafeName: cafe.name, cafeImage: cafe.image || '' },
        });
        return;
      }
      router.push(`/cafe/${cafe.id}`);
    },
    [isReviewMode]
  );

  const selectCafe = useCallback(
    (cafe: Cafe) => {
      Keyboard.dismiss();
      addCafe(cafe);
      addToRecent(cafe);
      openPicked(cafe);
    },
    [addCafe, addToRecent, openPicked]
  );

  const selectRecent = useCallback(
    (entry: RecentSearch) => {
      Keyboard.dismiss();
      addToRecent(entry);
      addCafe({
        id: entry.id,
        name: entry.name,
        location: entry.location,
        // A 0 here won't clobber a real rating already loaded for this cafe —
        // addCafe preserves the existing rating when the incoming one is falsy.
        rating: entry.rating ?? 0,
        image: entry.image || DEFAULT_CAFE_IMAGE,
        description: entry.location ? `A cafe located at ${entry.location}.` : '',
        reviews: [],
        place_id: entry.place_id || entry.id,
        photos: [entry.image || DEFAULT_CAFE_IMAGE],
      });
      openPicked(entry);
    },
    [addCafe, addToRecent, openPicked]
  );

  const renderRecent = useCallback(
    ({ item }: { item: RecentSearch }) => (
      <SearchRow
        name={item.name}
        location={item.location}
        image={item.image}
        onPress={() => selectRecent(item)}
        onRemove={() => removeFromRecent(item.id)}
      />
    ),
    [selectRecent, removeFromRecent]
  );

  const renderResult = useCallback(
    ({ item }: { item: Cafe }) => (
      <SearchRow
        name={item.name}
        location={item.location}
        image={item.image}
        onPress={() => selectCafe(item)}
      />
    ),
    [selectCafe]
  );

  const isIdle = searchQuery.trim() === '' && !isSearching && searchResults.length === 0;
  const showRecents = isIdle && recentSearches.length > 0;
  const showEmptyBean = isIdle && recentSearches.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Figma Input: back chevron and clear inside one bordered field. */}
      <View style={styles.header}>
        <View style={styles.input}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <SvgXml xml={CHEVRON_LEFT_14_SVG} width={14} height={14} />
          </TouchableOpacity>
          <TextInput
            style={styles.inputText}
            placeholder="Search Cafes"
            placeholderTextColor={colors.greyNormal}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <SvgXml xml={CLOSE_14_SVG} width={14} height={14} />
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
        <View style={styles.body}>
          <View style={styles.recentsHeader}>
            <Text style={styles.recentsTitle}>Recent Searches</Text>
            <TouchableOpacity onPress={clearAllRecent} hitSlop={8}>
              <Text style={styles.clearAllText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={recentSearches}
            keyExtractor={(item) => item.id}
            renderItem={renderRecent}
            getItemLayout={getRowLayout}
            keyboardShouldPersistTaps="always"
          />
        </View>
      )}

      {searchResults.length === 0 &&
        !isSearching &&
        !isSearchingMore &&
        searchQuery.trim().length >= MIN_QUERY_LENGTH && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No cafes found</Text>
            <Text style={styles.emptyText}>Try a different search term</Text>
          </View>
        )}

      {searchResults.length === 0 && (isSearching || isSearchingMore) && (
        <View style={styles.emptyState}>
          <ActivityIndicator color={colors.ink} />
          <Text style={styles.emptyText}>
            {isSearchingMore ? 'Searching more places…' : 'Searching...'}
          </Text>
        </View>
      )}

      {searchResults.length > 0 && (
        <FlatList
          style={styles.body}
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderResult}
          getItemLayout={getRowLayout}
          keyboardShouldPersistTaps="always"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
  },
  input: {
    ...softShadow,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.inputGrey,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.md,
  },
  inputText: {
    ...type.body1,
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    color: colors.ink,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  recentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  recentsTitle: {
    ...type.h2,
    color: colors.ink,
  },
  clearAllText: {
    ...type.footnote1,
    color: colors.slate,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  rowText: {
    flex: 1,
    gap: spacing.xs,
  },
  rowName: {
    ...type.title1,
    color: colors.ink,
  },
  rowLocation: {
    ...type.footnote1,
    color: colors.ink,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    ...type.body1,
    lineHeight: 22,
    color: colors.greyNormal,
    textAlign: 'center',
  },
});
