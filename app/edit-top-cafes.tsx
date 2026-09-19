import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import BeanRating from '../components/BeanRating';
import BeanLogo from '../components/BeanLogo';
import Button from '../components/ui/Button';
import CafeCard from '../components/ui/CafeCard';
import Tag from '../components/ui/Tag';
import TopAppBar from '../components/ui/TopAppBar';
import {
  indexByCafe,
  MAX_TOP_CAFES,
  type TopCafe,
} from '../components/profile/TopCafesSection';
import { useReviews } from '../context/ReviewContext';
import { useToast } from '../context/ToastContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { updateProfile } from '../lib/profile';
import { searchCafesByText, convertPlaceToCafe } from '../services/googlePlaces';
import {
  DRAG_VERTICAL_SVG,
  MINUS_CIRCLE_SVG,
  PLUS_CIRCLE_SVG,
  SEARCH_SMALL_SVG,
} from '@/constants/figmaIcons';
import { colors, radius, spacing, type } from '@/constants/theme';

// Rows are a fixed height so a drag can be turned into an index by division
// rather than by measuring each row.
const ROW_HEIGHT = 87;
const ROW_GAP = spacing.md;
const ROW_STRIDE = ROW_HEIGHT + ROW_GAP;

// Only reach for Places when the local list cannot answer, and only once the
// query is long enough to be meaningful. Every call here is billable.
const SEARCH_DEBOUNCE_MS = 450;
const SEARCH_MIN_CHARS = 3;

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

/** One row of the picked list: the card, a remove control and a drag grip. */
function TopCafeRow({
  cafe,
  index,
  count,
  dragIndex,
  dragY,
  hoverIndex,
  onRemove,
  onReorder,
}: {
  cafe: TopCafe;
  index: number;
  count: number;
  dragIndex: ReturnType<typeof useSharedValue<number>>;
  dragY: ReturnType<typeof useSharedValue<number>>;
  hoverIndex: ReturnType<typeof useSharedValue<number>>;
  onRemove: () => void;
  onReorder: (from: number, to: number) => void;
}) {
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(120)
        .onBegin(() => {
          dragIndex.value = index;
          hoverIndex.value = index;
          dragY.value = 0;
        })
        .onUpdate((event) => {
          dragY.value = event.translationY;
          hoverIndex.value = clamp(
            index + Math.round(event.translationY / ROW_STRIDE),
            0,
            count - 1
          );
        })
        .onEnd(() => {
          if (hoverIndex.value !== index) {
            runOnJS(onReorder)(index, hoverIndex.value);
          }
        })
        .onFinalize(() => {
          dragIndex.value = -1;
          dragY.value = 0;
          hoverIndex.value = -1;
        }),
    [count, dragIndex, dragY, hoverIndex, index, onReorder]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const from = dragIndex.value;

    if (from === -1) {
      return { transform: [{ translateY: 0 }], zIndex: 0, opacity: 1 };
    }
    if (from === index) {
      return { transform: [{ translateY: dragY.value }], zIndex: 10, opacity: 0.95 };
    }

    // A row the dragged card has passed over slides into the vacated slot.
    const to = hoverIndex.value;
    let shift = 0;
    if (from < index && to >= index) shift = -ROW_STRIDE;
    else if (from > index && to <= index) shift = ROW_STRIDE;

    return {
      transform: [{ translateY: withTiming(shift, { duration: 140 }) }],
      zIndex: 0,
      opacity: 1,
    };
  });

  return (
    <Animated.View style={[styles.row, animatedStyle]}>
      <CafeCard
        name={cafe.cafeName}
        imageUri={cafe.cafeImage}
        style={styles.rowCard}
        trailing={
          <TouchableOpacity
            onPress={onRemove}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${cafe.cafeName} from your top cafes`}
          >
            <SvgXml xml={MINUS_CIRCLE_SVG} width={16} height={16} />
          </TouchableOpacity>
        }
        footer={<BeanRating rating={cafe.rating} size={12} />}
      />
      <GestureDetector gesture={pan}>
        <View
          style={styles.grip}
          accessibilityLabel={`Reorder ${cafe.cafeName}, position ${index + 1} of ${count}`}
        >
          <SvgXml xml={DRAG_VERTICAL_SVG} width={24} height={24} />
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

/** One candidate row in the "from your visited cafes" list. */
function CandidateRow({
  cafe,
  disabled,
  onAdd,
}: {
  cafe: TopCafe;
  disabled: boolean;
  onAdd: () => void;
}) {
  return (
    <View style={styles.candidate}>
      {cafe.cafeImage ? (
        <Image source={{ uri: cafe.cafeImage }} style={styles.candidateImage} />
      ) : (
        <View style={[styles.candidateImage, styles.candidateImageFallback]}>
          <BeanLogo width={18} height={30} color={colors.background} />
        </View>
      )}
      <View style={styles.candidateBody}>
        <Text style={styles.candidateName} numberOfLines={1}>
          {cafe.cafeName}
        </Text>
        <View style={styles.candidateRating}>
          <BeanRating rating={cafe.rating} size={12} />
        </View>
      </View>
      <Button
        label="Add"
        variant="secondary"
        onPress={onAdd}
        disabled={disabled}
        style={styles.addButton}
      />
    </View>
  );
}

export default function EditTopCafesScreen() {
  const router = useRouter();
  const { userReviews } = useReviews();
  const { profile, refetch } = useUserProfile();
  const { showToast } = useToast();

  const visited = useMemo(() => indexByCafe(userReviews), [userReviews]);

  const initialIds = useMemo(
    () => (Array.isArray(profile?.top_cafes) ? (profile!.top_cafes as string[]) : []),
    [profile?.top_cafes]
  );

  const [picked, setPicked] = useState<TopCafe[]>([]);
  const [query, setQuery] = useState('');
  const [remoteResults, setRemoteResults] = useState<TopCafe[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const dragIndex = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const hoverIndex = useSharedValue(-1);

  // Seed from the saved list once the profile has loaded.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !profile) return;
    seededRef.current = true;
    setPicked(
      initialIds
        .map((id) => visited.get(id))
        .filter((c): c is TopCafe => !!c)
        .slice(0, MAX_TOP_CAFES)
    );
  }, [initialIds, profile, visited]);

  const pickedIds = useMemo(() => new Set(picked.map((c) => c.cafeId)), [picked]);

  const localCandidates = useMemo(() => {
    const all = Array.from(visited.values()).sort((a, b) => b.rating - a.rating);
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((c) => c.cafeName.toLowerCase().includes(q));
  }, [visited, query]);

  // Places is only consulted when the user's own visited cafes cannot satisfy
  // the query, which keeps this screen off the billable path in normal use.
  useEffect(() => {
    const q = query.trim();
    if (q.length < SEARCH_MIN_CHARS || localCandidates.length > 0) {
      setRemoteResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const places = await searchCafesByText(q);
        const converted = await Promise.all(
          places.slice(0, 8).map((place) => convertPlaceToCafe(place))
        );
        if (cancelled) return;
        setRemoteResults(
          converted.map((cafe: any) => ({
            cafeId: cafe.id,
            cafeName: cafe.name,
            cafeImage: cafe.image,
            rating: cafe.rating ?? 0,
          }))
        );
      } catch {
        if (!cancelled) setRemoteResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, localCandidates.length]);

  const candidates = localCandidates.length > 0 ? localCandidates : remoteResults;

  const handleReorder = useCallback((from: number, to: number) => {
    setPicked((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const handleAdd = (cafe: TopCafe) => {
    setPicked((prev) =>
      prev.length >= MAX_TOP_CAFES || prev.some((c) => c.cafeId === cafe.cafeId)
        ? prev
        : [...prev, cafe]
    );
  };

  const handleRemove = (cafeId: string) =>
    setPicked((prev) => prev.filter((c) => c.cafeId !== cafeId));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ topCafes: picked.map((c) => c.cafeId) });
      await refetch();
      showToast({ message: 'Top cafes updated', variant: 'success' });
      router.back();
    } catch (err) {
      setSaving(false);
      showToast({
        message: err instanceof Error ? err.message : 'Could not save your top cafes',
        variant: 'favorite',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <TopAppBar title="Edit Top Cafes" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.pickedBlock}>
          <View style={styles.pickedHeader}>
            <Text style={styles.pickedTitle}>Your Top Cafes</Text>
            <Tag label={`${picked.length}/${MAX_TOP_CAFES}`} size="s" />
          </View>

          {picked.map((cafe, index) => (
            <TopCafeRow
              key={cafe.cafeId}
              cafe={cafe}
              index={index}
              count={picked.length}
              dragIndex={dragIndex}
              dragY={dragY}
              hoverIndex={hoverIndex}
              onRemove={() => handleRemove(cafe.cafeId)}
              onReorder={handleReorder}
            />
          ))}

          {picked.length < MAX_TOP_CAFES && (
            <View style={styles.row}>
              <View style={[styles.rowCard, styles.placeholderCard]}>
                <View style={styles.placeholderThumb}>
                  <BeanLogo width={18} height={30} color={colors.accent2} />
                </View>
                <Text style={styles.placeholderText}>Add a cafe</Text>
              </View>
              <View style={styles.grip}>
                <SvgXml xml={PLUS_CIRCLE_SVG} width={24} height={24} />
              </View>
            </View>
          )}
        </View>

        <View style={styles.pickerBlock}>
          <View style={styles.search}>
            <SvgXml xml={SEARCH_SMALL_SVG} width={14} height={14} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search Cafes"
              placeholderTextColor={colors.greyNormal}
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>

          <Text style={styles.pickerLabel}>
            {localCandidates.length > 0 ? 'From your visited cafes' : 'Search results'}
          </Text>

          {searching && <ActivityIndicator color={colors.ink} style={styles.searchSpinner} />}

          {!searching && candidates.length === 0 && (
            <Text style={styles.emptyText}>
              {query.trim()
                ? 'No cafes matched that search.'
                : 'Log a visit and the cafe will show up here.'}
            </Text>
          )}

          {candidates.map((cafe) => (
            <CandidateRow
              key={cafe.cafeId}
              cafe={cafe}
              disabled={pickedIds.has(cafe.cafeId) || picked.length >= MAX_TOP_CAFES}
              onAdd={() => handleAdd(cafe)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
        <Button
          label="Save"
          onPress={handleSave}
          loading={saving}
          style={styles.saveButton}
        />
      </View>
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  pickedBlock: {
    gap: ROW_GAP,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  pickedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pickedTitle: {
    ...type.h1,
    flex: 1,
    color: colors.ink,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: ROW_HEIGHT,
  },
  rowCard: {
    flex: 1,
    height: ROW_HEIGHT,
  },
  grip: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.separator,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  placeholderThumb: {
    width: ROW_HEIGHT,
    height: ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.greyExtraLight,
  },
  placeholderText: {
    ...type.body1,
    flex: 1,
    paddingHorizontal: spacing.sm,
    color: colors.greyNormal,
  },
  pickerBlock: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.inputGrey,
  },
  searchInput: {
    ...type.body1,
    flex: 1,
    color: colors.ink,
    padding: 0,
  },
  pickerLabel: {
    ...type.footnote1,
    color: colors.greyNormal,
  },
  searchSpinner: {
    marginVertical: spacing.md,
  },
  emptyText: {
    ...type.body1,
    color: colors.greyNormal,
  },
  candidate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  candidateImage: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.greyExtraLight,
  },
  candidateImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  candidateBody: {
    flex: 1,
    gap: spacing.xs,
  },
  candidateName: {
    ...type.title1,
    color: colors.ink,
  },
  candidateRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  addButton: {
    height: 32,
    paddingVertical: 0,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  saveButton: {
    flex: 1,
  },
});
