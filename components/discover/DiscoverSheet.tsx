import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import CafeListCard, { EMPTY_ATTRIBUTES } from '../cafe/CafeListCard';
import type { Cafe } from '../../data/mockData';
import type { CafeAttribute } from '../../lib/cafeAttributes';
import type { CafeCategory } from '../../lib/cafeCategories';
import { colors, radius, spacing, type } from '@/constants/theme';

export interface DiscoverSheetHandle {
  /** Scroll the list to a cafe and lift the sheet so it is visible. */
  revealCafe: (cafeId: string) => void;
}

interface DiscoverSheetProps {
  cafes: Cafe[];
  /** Matching cafes in the whole viewport, which can exceed the loaded list. */
  total: number;
  attributesFor: (cafeId: string) => CafeAttribute[] | undefined;
  categoryById: Map<string, CafeCategory>;
  isBookmarked: (cafeId: string) => boolean;
  isFavorited: (cafeId: string) => boolean;
  distanceFor: (cafe: Cafe) => string | undefined;
  isLoading: boolean;
  isFetchingMore: boolean;
  emptyMessage: string;
  onCardPress: (cafe: Cafe) => void;
  onToggleBookmark: (cafe: Cafe) => void;
  onEndReached: () => void;
}

// Figma's card stacks are spaced 16pt apart.
function CardGap() {
  return <View style={styles.cardGap} />;
}

const DiscoverSheet = forwardRef<DiscoverSheetHandle, DiscoverSheetProps>(function DiscoverSheet(
  {
    cafes,
    total,
    attributesFor,
    categoryById,
    isBookmarked,
    isFavorited,
    distanceFor,
    isLoading,
    isFetchingMore,
    emptyMessage,
    onCardPress,
    onToggleBookmark,
    onEndReached,
  },
  ref
) {
  const sheetRef = useRef<BottomSheet>(null);
  const listRef = useRef<any>(null);
  const [sheetIndex, setSheetIndex] = useState(1);
  const snapPoints = useMemo(() => ['15%', '30%', '80%'], []);

  useImperativeHandle(
    ref,
    () => ({
      revealCafe: (cafeId: string) => {
        const index = cafes.findIndex((c) => c.id === cafeId);
        if (sheetIndex === 0) sheetRef.current?.snapToIndex(1);
        if (index >= 0) {
          listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
        }
      },
    }),
    [cafes, sheetIndex]
  );

  const handleHeaderPress = useCallback(() => {
    sheetRef.current?.snapToIndex(sheetIndex === 2 ? 1 : 2);
  }, [sheetIndex]);

  // Figma "Search / Results": a 40x4 ink handle over a "N cafes found" footnote.
  const renderHandle = useCallback(
    () => (
      <TouchableOpacity
        style={styles.header}
        activeOpacity={0.85}
        onPress={handleHeaderPress}
        accessibilityRole="button"
        accessibilityLabel={sheetIndex === 2 ? 'Collapse cafe list' : 'Expand cafe list'}
      >
        <View style={styles.dragHandle} />
        <Text style={styles.count}>
          {total} {total === 1 ? 'cafe' : 'cafes'} found
        </Text>
      </TouchableOpacity>
    ),
    [handleHeaderPress, sheetIndex, total]
  );

  const renderItem = useCallback(
    ({ item }: { item: Cafe }) => (
      <CafeListCard
        cafe={item}
        bookmarked={isBookmarked(item.id)}
        favorited={isFavorited(item.id)}
        distanceLabel={distanceFor(item)}
        attributes={attributesFor(item.id) ?? EMPTY_ATTRIBUTES}
        categoryById={categoryById}
        onPress={onCardPress}
        onToggleBookmark={onToggleBookmark}
      />
    ),
    [
      attributesFor,
      categoryById,
      distanceFor,
      isBookmarked,
      isFavorited,
      onCardPress,
      onToggleBookmark,
    ]
  );

  // Cards have variable height (chips can wrap), so a scroll to an unmeasured
  // row can fail; fall back to the nearest estimated offset and retry once.
  const handleScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      listRef.current?.scrollToOffset({
        offset: info.averageItemLength * info.index,
        animated: true,
      });
      setTimeout(
        () => listRef.current?.scrollToIndex({ index: info.index, animated: true }),
        250
      );
    },
    []
  );

  const footer = useMemo(
    () =>
      isFetchingMore ? <ActivityIndicator style={styles.footer} color={colors.ink} /> : undefined,
    [isFetchingMore]
  );

  const empty = useMemo(
    () => (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>
          {isLoading ? 'Loading cafes…' : 'No cafes here yet'}
        </Text>
        <Text style={styles.emptyText}>
          {isLoading ? 'Hang tight while we find spots in this area.' : emptyMessage}
        </Text>
      </View>
    ),
    [isLoading, emptyMessage]
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={1}
      snapPoints={snapPoints}
      onChange={setSheetIndex}
      handleComponent={renderHandle}
      backgroundStyle={styles.background}
      style={styles.sheet}
      enablePanDownToClose={false}
    >
      <BottomSheetFlatList
        ref={listRef}
        data={cafes}
        keyExtractor={(item: Cafe) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={CardGap}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        ListFooterComponent={footer}
        ListEmptyComponent={empty}
      />
    </BottomSheet>
  );
});

export default DiscoverSheet;

const styles = StyleSheet.create({
  // softShadow at Figma's 5pt blur, cast upward over the map.
  sheet: {
    shadowColor: '#262626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
  background: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
  header: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignSelf: 'center',
  },
  count: {
    ...type.footnote1,
    color: colors.greyNormal,
  },
  // The top padding doubles as the 16pt gap under the count, and gives the
  // first card's corner badge room to overhang without being clipped.
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
  cardGap: {
    height: spacing.md,
  },
  footer: {
    paddingVertical: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: spacing.lg,
    gap: 6,
  },
  emptyTitle: {
    ...type.title1,
    color: colors.ink,
  },
  emptyText: {
    ...type.body1,
    color: colors.greyNormal,
    textAlign: 'center',
  },
});
