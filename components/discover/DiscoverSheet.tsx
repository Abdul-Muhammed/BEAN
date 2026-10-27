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
import MapCafeCard from '../MapCafeCard';
import type { Cafe } from '../../data/mockData';
import type { CafeAttribute } from '../../lib/cafeAttributes';
import type { CafeCategory } from '../../lib/cafeCategories';
import { colors } from '@/constants/theme';

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
  selectedId: string | null;
  isLoading: boolean;
  isFetchingMore: boolean;
  emptyMessage: string;
  onCardPress: (cafe: Cafe) => void;
  onEndReached: () => void;
}

const DiscoverSheet = forwardRef<DiscoverSheetHandle, DiscoverSheetProps>(function DiscoverSheet(
  {
    cafes,
    total,
    attributesFor,
    categoryById,
    selectedId,
    isLoading,
    isFetchingMore,
    emptyMessage,
    onCardPress,
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

  const renderHandle = useCallback(
    () => (
      <TouchableOpacity style={styles.header} activeOpacity={0.85} onPress={handleHeaderPress}>
        <View style={styles.dragHandle} />
        <View style={styles.titleRow}>
          <Text style={styles.title}>Cafes in this area</Text>
          <Text style={styles.subtitle}>
            {total} {total === 1 ? 'cafe' : 'cafes'}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [handleHeaderPress, total]
  );

  const renderItem = useCallback(
    ({ item }: { item: Cafe }) => (
      <MapCafeCard
        cafe={item}
        attributes={attributesFor(item.id)}
        categoryById={categoryById}
        onPress={onCardPress}
        selected={item.id === selectedId}
      />
    ),
    [attributesFor, categoryById, onCardPress, selectedId]
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
        extraData={selectedId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        // Cards have variable height, so a scroll to an unmeasured row can
        // fail; fall back to the nearest measured offset and retry once.
        onScrollToIndexFailed={(info: { index: number; averageItemLength: number }) => {
          listRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: true,
          });
          setTimeout(
            () => listRef.current?.scrollToIndex({ index: info.index, animated: true }),
            250
          );
        }}
        ListFooterComponent={
          isFetchingMore ? (
            <ActivityIndicator style={styles.footer} color={colors.primary} />
          ) : undefined
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {isLoading ? 'Loading cafes…' : 'No cafes here yet'}
            </Text>
            <Text style={styles.emptyText}>
              {isLoading ? 'Hang tight while we find spots in this area.' : emptyMessage}
            </Text>
          </View>
        }
      />
    </BottomSheet>
  );
});

export default DiscoverSheet;

const styles = StyleSheet.create({
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  background: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: 'OtomanopeeOne-Regular',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  footer: {
    paddingVertical: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'Lato-Bold',
    color: colors.primary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    textAlign: 'center',
  },
});
