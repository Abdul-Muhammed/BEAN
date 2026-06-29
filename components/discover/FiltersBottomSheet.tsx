import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { SvgXml } from 'react-native-svg';
import { colors } from '@/constants/theme';
import SwipeableBeanRating from '@/components/SwipeableBeanRating';
import { getCafeCategories, type CafeCategory } from '@/lib/cafeCategories';
import FilterChip from './FilterChip';
import {
  type Filters,
  DEFAULT_FILTERS,
  QUICK_FILTERS,
} from './filterTypes';

const CATEGORY_COLLAPSED_COUNT = 8;

export interface FiltersBottomSheetHandle {
  open: () => void;
}

interface FiltersBottomSheetProps {
  committed: Filters;
  onApply: (filters: Filters) => void;
  /** Live count of matching cafes for a given draft (over the nearby list set). */
  countFor: (filters: Filters) => number;
}

const FiltersBottomSheet = forwardRef<
  FiltersBottomSheetHandle,
  FiltersBottomSheetProps
>(({ committed, onApply, countFor }, ref) => {
  const modalRef = useRef<BottomSheetModal>(null);
  const [draft, setDraft] = useState<Filters>(committed);
  const [categories, setCategories] = useState<CafeCategory[]>([]);
  const [showAllCategories, setShowAllCategories] = useState(false);

  const snapPoints = useMemo(() => ['85%'], []);

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        // Draft always starts from the committed selections; dismissing without
        // applying simply discards it.
        setDraft(committed);
        setShowAllCategories(false);
        modalRef.current?.present();
      },
    }),
    [committed]
  );

  useEffect(() => {
    let active = true;
    getCafeCategories()
      .then((data) => {
        if (active) setCategories(data);
      })
      .catch((err) => console.warn('Failed to load cafe categories:', err));
    return () => {
      active = false;
    };
  }, []);

  const toggleQuick = useCallback((key: keyof Filters) => {
    setDraft((d) => ({ ...d, [key]: !d[key] }));
  }, []);

  const handleRating = useCallback((value: number) => {
    setDraft((d) => ({ ...d, minRating: value }));
  }, []);

  // Swipable beans can't reach 0, so tapping the label clears to "Any".
  const clearRating = useCallback(() => {
    setDraft((d) => ({ ...d, minRating: 0 }));
  }, []);

  const toggleCategory = useCallback((label: string) => {
    setDraft((d) => ({
      ...d,
      categories: d.categories.includes(label)
        ? d.categories.filter((c) => c !== label)
        : [...d.categories, label],
    }));
  }, []);

  const handleReset = useCallback(() => {
    setDraft(DEFAULT_FILTERS);
    setShowAllCategories(false);
  }, []);

  const handleApply = useCallback(() => {
    onApply(draft);
    modalRef.current?.dismiss();
  }, [draft, onApply]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    []
  );

  const count = countFor(draft);
  const visibleCategories = showAllCategories
    ? categories
    : categories.slice(0, CATEGORY_COLLAPSED_COUNT);

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.sheetContent}>
        <Text style={styles.title}>Filters</Text>
        <BottomSheetScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Recommended quick-filters */}
          <Text style={styles.sectionTitle}>Recommended</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRow}
          >
            {QUICK_FILTERS.map(({ key, label }) => (
              <FilterChip
                key={key}
                label={label}
                active={Boolean(draft[key])}
                onPress={() => toggleQuick(key)}
              />
            ))}
          </ScrollView>

          {/* Minimum rating */}
          <Text style={styles.sectionTitle}>Minimum Rating</Text>
          <View style={styles.ratingRow}>
            <SwipeableBeanRating
              rating={draft.minRating}
              size={42}
              onChange={handleRating}
            />
            <TouchableOpacity
              onPress={clearRating}
              disabled={draft.minRating === 0}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.ratingLabel}>
                {draft.minRating > 0 ? `${draft.minRating}+` : 'Any'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Categories */}
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoriesWrap}>
            {visibleCategories.map((category) => {
              const selected = draft.categories.includes(category.label);
              return (
                <FilterChip
                  key={category.id}
                  label={category.label}
                  active={selected}
                  onPress={() => toggleCategory(category.label)}
                  leadingIcon={
                    !selected && category.icon_svg_xml ? (
                      <SvgXml
                        xml={category.icon_svg_xml}
                        width={14}
                        height={14}
                      />
                    ) : undefined
                  }
                />
              );
            })}
          </View>
          {categories.length > CATEGORY_COLLAPSED_COUNT && (
            <TouchableOpacity
              onPress={() => setShowAllCategories((s) => !s)}
              style={styles.showMoreButton}
            >
              <Text style={styles.showMoreText}>
                {showAllCategories ? 'Show Less' : 'Show More'}
              </Text>
            </TouchableOpacity>
          )}
        </BottomSheetScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleApply}
            style={styles.showButton}
            activeOpacity={0.9}
          >
            <Text style={styles.showButtonText}>
              {count === 1 ? 'Show 1 Cafe' : `Show ${count} Cafes`}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

FiltersBottomSheet.displayName = 'FiltersBottomSheet';

export default FiltersBottomSheet;

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: '#D1D1D6',
    width: 44,
    height: 5,
  },
  sheetContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: 'OtomanopeeOne-Regular',
    color: colors.primary,
    textAlign: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Lato-Black',
    color: colors.primary,
    marginTop: 20,
    marginBottom: 12,
  },
  quickRow: {
    gap: 8,
    paddingRight: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingLabel: {
    fontSize: 15,
    fontFamily: 'Lato-Bold',
    color: colors.mutedText,
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  showMoreButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  showMoreText: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  resetButton: {
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  resetText: {
    fontSize: 15,
    fontFamily: 'Lato-Bold',
    color: colors.mutedText,
  },
  showButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showButtonText: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#FFFFFF',
  },
});
