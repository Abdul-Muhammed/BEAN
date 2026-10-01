import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';

import BeanLogo from '../../components/BeanLogo';
import BeanRating from '../../components/BeanRating';
import Button from '../../components/ui/Button';
import HeroPillButton from '../../components/ui/HeroPillButton';
import Tag from '../../components/ui/Tag';
import { useAuth } from '../../context/AuthContext';
import { useReviews } from '../../context/ReviewContext';
import { useToast } from '../../context/ToastContext';
import ConfirmationModal from '../../components/settings/ConfirmationModal';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useLocation } from '../../hooks/useLocation';
import { getCafeCategories, type CafeCategory } from '../../lib/cafeCategories';
import { getReviewById } from '../../lib/follows';
import type { PublicUser } from '../../lib/follows';
import { approximateDistanceMeters, extractLocation, formatDistance } from '../../lib/geo';
import {
  ARROW_LEFT_HERO_SVG,
  CHEVRON_RIGHT_SVG,
  HEART_12_FILLED_SVG,
  MAP_PIN_12_SVG,
  PENCIL_SVG,
} from '@/constants/figmaIcons';
import { colors, radius, spacing, type } from '@/constants/theme';
import { UserReview } from '../../data/mockData';

const HERO_HEIGHT = 223;

export default function DiaryEntryScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const { userReviews, loading, getCafeById, addCafe, isFavorited, deleteReview } =
    useReviews();
  const { showToast } = useToast();
  const { profile } = useUserProfile();
  // Location comes from the shared hook rather than the profile row, since
  // onboarding no longer collects it. The hook falls back to the profile's
  // saved coordinates for users who set them before that change.
  const { coords } = useLocation();
  const { user } = useAuth();

  const reviewId = Array.isArray(id) ? id[0] : id;

  const localReview = useMemo(
    () => userReviews.find((entry) => entry.id === reviewId),
    [reviewId, userReviews]
  );

  // A review opened from a shared link belongs to someone else, so it won't be
  // in the local cache and has to be fetched. `fetching` keeps the not-found
  // state from flashing before that request settles.
  const [remote, setRemote] = useState<{ review: UserReview; author: PublicUser | null } | null>(
    null
  );
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (localReview || !reviewId) return;
    let cancelled = false;
    setFetching(true);
    getReviewById(reviewId)
      .then((result) => {
        if (!cancelled) setRemote(result);
      })
      .catch(() => {
        /* Falls through to the not-found state. */
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [localReview, reviewId]);

  const review = localReview ?? remote?.review;
  const author = localReview ? null : remote?.author ?? null;
  // Anything in `userReviews` is by definition yours; a fetched one is only
  // yours if the ids line up.
  const isOwner = !!localReview || (!!author && !!user && author.id === user.id);

  const photos = useMemo(() => review?.photos?.filter(Boolean) ?? [], [review?.photos]);
  const attributes = useMemo(() => review?.attributes?.filter(Boolean) ?? [], [review?.attributes]);

  // Attribute chips carry the same icon the category was picked with. Only
  // fetched when the review actually has attributes.
  const [categories, setCategories] = useState<CafeCategory[]>([]);
  useEffect(() => {
    if (attributes.length === 0) return;
    let cancelled = false;
    getCafeCategories()
      .then((rows) => {
        if (!cancelled) setCategories(rows);
      })
      .catch(() => {
        /* Chips fall back to label-only. */
      });
    return () => {
      cancelled = true;
    };
  }, [attributes.length]);

  // reviews.attributes stores category ids; labels are for display only, so a
  // category can be renamed without orphaning historical reviews.
  const categoryById = useMemo(() => {
    const map = new Map<string, CafeCategory>();
    categories.forEach((category) => map.set(category.id, category));
    return map;
  }, [categories]);

  const [photoIndex, setPhotoIndex] = useState(0);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const heroListRef = useRef<FlatList<string>>(null);

  const handleHeroScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
      setPhotoIndex(next);
    },
    [screenWidth]
  );

  const cafe = review ? getCafeById(review.cafeId) : undefined;

  const handleViewCafe = () => {
    if (!review) return;
    if (cafe) addCafe(cafe);
    router.push({ pathname: '/cafe/[id]', params: { id: review.cafeId } });
  };

  if ((loading || fetching) && !review) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading diary entry...</Text>
      </SafeAreaView>
    );
  }

  if (!review) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <BeanLogo width={58} height={98} />
        <Text style={styles.emptyTitle}>Diary entry not found</Text>
        <Text style={styles.emptySubtitle}>
          This log may still be syncing, or it may no longer be available.
        </Text>
        <TouchableOpacity style={styles.backHomeButton} onPress={() => router.back()}>
          <Text style={styles.backHomeButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isFav = isFavorited(review.cafeId);

  // Only shown when we know both ends of the measurement; otherwise the row
  // quietly falls back to the suburb alone, or disappears entirely.
  const city = cafe ? extractLocation(cafe.location) : '';
  let distanceLabel = '';
  if (coords && typeof cafe?.latitude === 'number' && typeof cafe?.longitude === 'number') {
    distanceLabel = formatDistance(
      approximateDistanceMeters(
        coords.latitude,
        coords.longitude,
        cafe.latitude,
        cafe.longitude
      )
    );
  }

  const authorName = author
    ? author.username ||
      [author.first_name, author.last_name].filter(Boolean).join(' ') ||
      'A Bean user'
    : '';


  // Edit and Delete live behind the hero overflow button rather than a row of
  // pills, matching the ActionSheet-with-Alert-fallback pattern used for the
  // photo picker in ReviewForm.
  const openOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Edit Review', 'Delete Review', 'Cancel'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) router.push(`/edit-review/${review.id}` as any);
          else if (index === 1) setConfirmDeleteVisible(true);
        }
      );
    } else {
      Alert.alert('Review Options', undefined, [
        { text: 'Edit Review', onPress: () => router.push(`/edit-review/${review.id}` as any) },
        {
          text: 'Delete Review',
          style: 'destructive',
          onPress: () => setConfirmDeleteVisible(true),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const ok = await deleteReview(review.id);
    setDeleting(false);
    setConfirmDeleteVisible(false);

    if (!ok) {
      Alert.alert('Could not delete review', 'Something went wrong. Please try again.');
      return;
    }

    router.back();
    showToast({ message: 'Review deleted' });
  };

  return (
    // The Figma frame puts the status bar on the cream background above the
    // photo rather than over it, so the hero starts below the top inset.
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          {photos.length > 0 ? (
            <FlatList
              ref={heroListRef}
              data={photos}
              keyExtractor={(photo, index) => `${photo}-${index}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleHeroScroll}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={{ width: screenWidth, height: HERO_HEIGHT }}
                  resizeMode="cover"
                />
              )}
            />
          ) : review.cafeImage ? (
            <Image source={{ uri: review.cafeImage }} style={styles.heroFallbackImage} />
          ) : (
            <View style={[styles.heroFallbackImage, styles.heroPlaceholder]}>
              <BeanLogo width={42} height={70} color={colors.white} />
            </View>
          )}

          <HeroPillButton
            xml={ARROW_LEFT_HERO_SVG}
            side="left"
            label="Go back"
            onPress={() => router.back()}
          />
          {/* The frame draws a pencil here. It still opens the Edit/Delete
              sheet rather than jumping straight to the editor, because that
              sheet is the only route to deleting a review. */}
          {isOwner && (
            <HeroPillButton
              xml={PENCIL_SVG}
              side="right"
              label="Review options"
              onPress={openOptions}
            />
          )}

          {photos.length > 1 && (
            <View style={styles.dots}>
              {photos.map((photo, index) => (
                <View
                  key={`dot-${photo}-${index}`}
                  style={[styles.dot, index === photoIndex && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.dateStrip}>
          <Text style={styles.dateText}>{review.date}</Text>
          <View style={styles.dateStripRight}>
            <BeanRating rating={review.rating} size={12} />
            {isFav && <SvgXml xml={HEART_12_FILLED_SVG} width={12} height={12} />}
          </View>
        </View>

        <View style={styles.container16}>
          {!isOwner && !!authorName && (
            <View style={styles.byline}>
              {author?.profile_image_url ? (
                <Image source={{ uri: author.profile_image_url }} style={styles.bylineAvatar} />
              ) : (
                <View style={[styles.bylineAvatar, styles.bylineAvatarFallback]} />
              )}
              <Text style={styles.bylineText} numberOfLines={1}>
                Reviewed by {authorName}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.cafeCard} onPress={handleViewCafe} activeOpacity={0.85}>
            <Image
              source={{ uri: cafe?.image || review.cafeImage }}
              style={styles.cafeThumb}
              resizeMode="cover"
            />
            <View style={styles.cafeCardBody}>
              <View style={styles.cafeCardText}>
                <Text style={styles.cafeName} numberOfLines={1}>
                  {cafe?.name || review.cafeName}
                </Text>
                {!!city && (
                  <View style={styles.cafeLocationRow}>
                    <SvgXml xml={MAP_PIN_12_SVG} width={12} height={12} />
                    <Text style={styles.cafeLocationText} numberOfLines={1}>
                      {distanceLabel ? `${city} • ${distanceLabel}` : city}
                    </Text>
                  </View>
                )}
              </View>
              <SvgXml xml={CHEVRON_RIGHT_SVG} width={16} height={16} />
            </View>
          </TouchableOpacity>

          {!!review.orderedItem && (
            <View style={styles.orderRow}>
              <View style={styles.orderChip}>
                <Text style={styles.orderChipText}>{review.orderedItem}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.notesSection}>
          <Text style={styles.notesHeading}>Notes</Text>
          <Text style={review.text ? styles.notesText : styles.notesTextMuted}>
            {review.text || 'No notes added for this visit.'}
          </Text>

          {attributes.length > 0 && (
            <View style={styles.attributeRow}>
              {attributes.map((attribute) => (
                <Tag
                  key={attribute}
                  label={categoryById.get(attribute)?.label ?? attribute}
                  iconXml={categoryById.get(attribute)?.icon_svg_xml}
                  variant="outlineDark"
                  dense
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Share Review"
          onPress={() => router.push(`/share-review/${review.id}` as any)}
        />
      </View>

      <ConfirmationModal
        visible={confirmDeleteVisible}
        title="Delete review?"
        message="This removes the review and its photos for good. This can't be undone."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: colors.mutedText,
  },
  emptyTitle: {
    marginTop: 24,
    fontSize: 22,
    fontFamily: 'OtomanopeeOne-Regular',
    color: colors.primary,
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 15,
    fontFamily: 'Lato-Regular',
    lineHeight: 22,
    color: colors.mutedText,
    textAlign: 'center',
  },
  backHomeButton: {
    marginTop: 24,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  backHomeButtonText: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  hero: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
    backgroundColor: colors.disabled,
  },
  heroFallbackImage: {
    width: '100%',
    height: HERO_HEIGHT,
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 254, 251, 0.5)',
  },
  dotActive: {
    backgroundColor: colors.background,
  },
  dateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cream,
  },
  dateText: {
    ...type.footnote1,
    flex: 1,
    color: colors.ink,
  },
  dateStripRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  container16: {
    gap: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cream,
  },
  byline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bylineAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.greyExtraLight,
  },
  bylineAvatarFallback: {
    borderWidth: 1,
    borderColor: colors.separator,
  },
  bylineText: {
    ...type.footnote1,
    flex: 1,
    color: colors.slate,
  },
  cafeCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.separator,
    backgroundColor: colors.background,
  },
  // Square and as tall as the card, matching the Figma aspect-[170/170] thumb.
  cafeThumb: {
    aspectRatio: 1,
    backgroundColor: colors.disabled,
  },
  cafeCardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  cafeCardText: {
    flex: 1,
    gap: 4,
  },
  cafeName: {
    ...type.title1,
    color: colors.ink,
  },
  cafeLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cafeLocationText: {
    ...type.footnote1,
    flex: 1,
    color: colors.slate,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  orderChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.background,
    backgroundColor: colors.heartRed,
  },
  orderChipText: {
    ...type.body1,
    color: colors.background,
    textAlign: 'center',
  },
  notesSection: {
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.creamBorder,
    backgroundColor: colors.cream,
  },
  notesHeading: {
    ...type.title1,
    color: colors.ink,
  },
  notesText: {
    ...type.body1,
    lineHeight: 20,
    color: colors.ink,
  },
  notesTextMuted: {
    ...type.body1,
    lineHeight: 20,
    color: colors.greyNormal,
  },
  attributeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  footer: {
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
});
