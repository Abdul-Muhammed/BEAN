import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Linking,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';

import ReviewCard from '../../components/ReviewCard';
import CafeDetailSkeleton from '../../components/CafeDetailSkeleton';
import PhotoGallery from '../../components/PhotoGallery';
import BeanScore from '../../components/ui/BeanScore';
import Button from '../../components/ui/Button';
import HeroPillButton from '../../components/ui/HeroPillButton';
import RatingGraph from '../../components/ui/RatingGraph';
import StatTiles from '../../components/ui/StatTiles';
import Tag from '../../components/ui/Tag';
import SectionHeader from '../../components/profile/SectionHeader';
import { useReviews } from '../../context/ReviewContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import { getCafeCategories, type CafeCategory } from '../../lib/cafeCategories';
import { getAttributesForCafes, type CafeAttribute } from '../../lib/cafeAttributes';
import { enrichCafeWithDetails } from '../../services/googlePlaces';
import { colors, radius, spacing, type } from '@/constants/theme';
import {
  ARROW_LEFT_HERO_SVG,
  BOOKMARK_24_FILLED_SVG,
  BOOKMARK_24_SVG,
  CLOCK_SVG,
  EXTERNAL_LINK_SVG,
  HEART_24_FILLED_SVG,
  HEART_24_SVG,
  MAP_PIN_16_SVG,
  MORE_HORIZONTAL_SVG,
  PLUS_CIRCLE_LIGHT_SVG,
} from '@/constants/figmaIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HERO_HEIGHT = 223;

// Stock fallback used by list/search results before real cached photos load.
// Treated as "not a real photo" so detail enrichment always replaces it.
const DEFAULT_CAFE_IMAGE =
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800';

function isPlaceholderImage(uri: string | undefined | null): boolean {
  return !uri || uri === DEFAULT_CAFE_IMAGE;
}

function hasRealPhotos(photos: string[] | undefined | null): boolean {
  return Array.isArray(photos) && photos.some((p) => !isPlaceholderImage(p));
}

export default function CafeDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const {
    cafes,
    toggleFavorite,
    isFavorited,
    toggleBookmark,
    isBookmarked,
    addCafe,
    getCafeById,
  } = useReviews();
  const { profile } = useUserProfile();
  const [isLoading, setIsLoading] = useState(true);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [headerPhotoIndex, setHeaderPhotoIndex] = useState(0);
  const [categories, setCategories] = useState<CafeCategory[]>([]);
  // What people actually reported about this cafe, most-agreed first.
  const [attributes, setAttributes] = useState<CafeAttribute[]>([]);
  const enrichedPlaceIds = useRef<Set<string>>(new Set());
  const cafeId = Array.isArray(id) ? id[0] : id;

  // Resolve live cafes first, then Supabase-backed saved/diary snapshots after a cold start.
  const cafe = cafeId ? getCafeById(cafeId) : undefined;

  useEffect(() => {
    // If cafe is found, stop loading quickly
    if (cafe) {
      setIsLoading(false);

      if (!cafes.some((c) => c.id === cafe.id)) {
        addCafe(cafe);
      }

      // Lazy load Place Details if cafe has place_id and hasn't been enriched yet
      if (
        cafe.place_id &&
        !enrichedPlaceIds.current.has(cafe.place_id) &&
        (!cafe.phone || !cafe.hours || !hasRealPhotos(cafe.photos))
      ) {
        const placeIdForEnrich = cafe.place_id;
        enrichedPlaceIds.current.add(placeIdForEnrich);
        enrichCafeWithDetails(placeIdForEnrich)
          .then((enrichedData) => {
            if (enrichedData) {
              // Prefer real cached cafe photos over the stock placeholder so the
              // header image and gallery swap in as soon as they load.
              const enrichedPhotos = Array.isArray(enrichedData.photos)
                ? enrichedData.photos.filter((p: string) => !isPlaceholderImage(p))
                : [];
              const nextPhotos =
                enrichedPhotos.length > 0
                  ? enrichedPhotos
                  : hasRealPhotos(cafe.photos)
                    ? cafe.photos
                    : cafe.photos || [cafe.image];
              const nextImage =
                enrichedPhotos[0] ||
                (!isPlaceholderImage(enrichedData.image) ? enrichedData.image : undefined) ||
                (hasRealPhotos(cafe.photos) ? cafe.photos?.[0] : undefined) ||
                cafe.image;

              const updatedCafe = {
                ...cafe,
                name: enrichedData.name || cafe.name,
                location: enrichedData.location || cafe.location,
                description: enrichedData.description || cafe.description,
                image: nextImage,
                phone: enrichedData.phone || cafe.phone,
                hours: enrichedData.hours || cafe.hours,
                photos: nextPhotos,
                rating: enrichedData.rating || cafe.rating,
              };
              addCafe(updatedCafe);

              // If enrichment still didn't yield a real photo, allow a future
              // attempt instead of permanently marking this place as enriched.
              if (!hasRealPhotos(nextPhotos) && isPlaceholderImage(nextImage)) {
                enrichedPlaceIds.current.delete(placeIdForEnrich);
              }
            } else {
              // No data came back; don't block a later retry this session.
              enrichedPlaceIds.current.delete(placeIdForEnrich);
            }
          })
          .catch((error) => {
            console.error('Error enriching cafe details:', error);
            enrichedPlaceIds.current.delete(placeIdForEnrich);
          });
      }
      return;
    }

    // If not found, wait a bit (cafe might be getting added to context)
    // This handles the case where addCafe() was called but context hasn't updated yet
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [cafe, cafeId, cafes, addCafe]);

  // Amenity chips carry the icon their category was defined with, so the
  // taxonomy stays editable in Supabase rather than hardcoded here.
  useEffect(() => {
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
  }, []);

  // Attributes are crowdsourced from reviews, so they are re-read whenever the
  // cafe changes rather than derived from the Google payload.
  useEffect(() => {
    if (!cafeId) return;
    let cancelled = false;
    getAttributesForCafes([cafeId]).then((map) => {
      if (!cancelled) setAttributes(map.get(cafeId) ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [cafeId]);

  const categoryById = useMemo(() => {
    const map = new Map<string, CafeCategory>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // A chip is filled when the attribute is one of the viewer's own onboarding
  // preferences, so the page shows at a glance how well the cafe fits them.
  const preferredIds = useMemo(
    () => new Set(Array.isArray(profile?.preferences) ? profile!.preferences : []),
    [profile?.preferences]
  );

  if (isLoading) {
    return <CafeDetailSkeleton />;
  }

  if (!cafe) {
    return (
      <SafeAreaView style={styles.notFound}>
        <Text style={styles.notFoundText}>Cafe not found</Text>
        <Button label="Go Back" onPress={() => router.back()} style={styles.notFoundButton} />
      </SafeAreaView>
    );
  }

  const realPhotos = (cafe.photos || []).filter((p) => !isPlaceholderImage(p));
  const photoCount = realPhotos.length;
  // Photos shown in the swipeable header carousel. Fall back to the single
  // cafe image when no real gallery photos have loaded yet.
  const headerPhotos = realPhotos.length > 0 ? realPhotos : [cafe.image];
  const safeHeaderIndex = Math.min(headerPhotoIndex, headerPhotos.length - 1);
  const isFav = isFavorited(cafe.id);
  const isSaved = isBookmarked(cafe.id);


  const handlePhonePress = () => {
    if (cafe.phone) Linking.openURL('tel:' + cafe.phone.replace(/\s/g, ''));
  };

  const handleLocationPress = () => {
    Linking.openURL('https://maps.google.com/?q=' + encodeURIComponent(cafe.location));
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: 'Check out ' + cafe.name + ' on Bean' });
    } catch {
      // User dismissed the share sheet.
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              setHeaderPhotoIndex(
                Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH)
              );
            }}
          >
            {headerPhotos.map((photo, index) => (
              <TouchableOpacity
                key={photo + '-' + index}
                activeOpacity={0.9}
                onPress={() => {
                  if (realPhotos.length > 0) setShowPhotoGallery(true);
                }}
              >
                <Image source={{ uri: photo }} style={styles.heroImage} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {headerPhotos.length > 1 && (
            <View style={styles.dots}>
              {headerPhotos.map((_, index) => (
                <View
                  key={index}
                  style={[styles.dot, index === safeHeaderIndex && styles.dotActive]}
                />
              ))}
            </View>
          )}

          <HeroPillButton
            xml={ARROW_LEFT_HERO_SVG}
            side="left"
            label="Go back"
            onPress={() => router.back()}
          />
          <HeroPillButton
            xml={MORE_HORIZONTAL_SVG}
            side="right"
            label="Share this cafe"
            onPress={handleShare}
          />

          {photoCount > 0 && (
            <TouchableOpacity
              style={styles.photosPill}
              onPress={() => setShowPhotoGallery(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.photosPillText}>{photoCount} Photos</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{cafe.name}</Text>
            <TouchableOpacity
              onPress={() => toggleFavorite(cafe.id)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={isFav ? 'Remove from favourites' : 'Add to favourites'}
            >
              <SvgXml
                xml={isFav ? HEART_24_FILLED_SVG : HEART_24_SVG}
                width={24}
                height={24}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleBookmark(cafe.id)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={isSaved ? 'Remove from saved' : 'Save this cafe'}
            >
              <SvgXml
                xml={isSaved ? BOOKMARK_24_FILLED_SVG : BOOKMARK_24_SVG}
                width={24}
                height={24}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.infoBlock}>
            <TouchableOpacity style={styles.infoRow} onPress={handleLocationPress}>
              <SvgXml xml={MAP_PIN_16_SVG} width={16} height={16} />
              <Text style={styles.infoText}>{cafe.location}</Text>
              <SvgXml xml={EXTERNAL_LINK_SVG} width={16} height={16} />
            </TouchableOpacity>

            {!!cafe.hours && (
              <View style={styles.infoRow}>
                <SvgXml xml={CLOCK_SVG} width={16} height={16} />
                {cafe.hours.openNow ? (
                  <Text style={styles.infoText}>
                    <Text style={styles.openNow}>Open Now</Text>
                    {(cafe.hours.currentHours || '').replace(/^Open Now/, '')}
                  </Text>
                ) : (
                  <Text style={styles.infoText}>
                    {cafe.hours.currentHours || 'Hours not available'}
                  </Text>
                )}
              </View>
            )}

            {!!cafe.phone && (
              <TouchableOpacity style={styles.infoRow} onPress={handlePhonePress}>
                {/* The frame puts a map pin on the phone row too. Kept as drawn;
                    no phone glyph exists in the exported icon set. */}
                <SvgXml xml={MAP_PIN_16_SVG} width={16} height={16} />
                <Text style={styles.infoText}>{cafe.phone}</Text>
              </TouchableOpacity>
            )}
          </View>

          {attributes.length > 0 && (
            <View style={styles.amenityRow}>
              {attributes.slice(0, 3).map(({ attributeId }) => (
                <Tag
                  key={attributeId}
                  label={categoryById.get(attributeId)?.label ?? attributeId}
                  iconXml={categoryById.get(attributeId)?.icon_svg_xml}
                  variant="outlineDark"
                  size="s"
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Ratings" action={<BeanScore rating={cafe.rating} />} />
          <RatingGraph
            ratings={cafe.reviews.map((r) => r.rating)}
            averageRating={cafe.rating}
          />
          <StatTiles
            reviewsCount={cafe.reviews.length}
            favouritesCount={cafe.favoritesCount || 0}
            savedCount={cafe.savedCount || 0}
          />
        </View>

        {attributes.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Amenities" />
            <View style={styles.amenityWrap}>
              {attributes.map(({ attributeId }) => (
                <Tag
                  key={attributeId}
                  label={categoryById.get(attributeId)?.label ?? attributeId}
                  iconXml={categoryById.get(attributeId)?.icon_svg_xml}
                  variant={preferredIds.has(attributeId) ? 'filled' : 'outlineDark'}
                />
              ))}
            </View>
          </View>
        )}

        {cafe.reviews.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Reviews" />
            {cafe.reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* The frame's footer is a single Add Review button. Saving already has a
          home in the bookmark beside the cafe name, so it is not repeated here. */}
      <View style={styles.footer}>
        <Button
          label="Add Review"
          iconXml={PLUS_CIRCLE_LIGHT_SVG}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/add-review',
              params: { cafeId: cafe.id, cafeName: cafe.name, cafeImage: cafe.image },
            })
          }
        />
      </View>

      {realPhotos.length > 0 && (
        <PhotoGallery
          photos={realPhotos}
          visible={showPhotoGallery}
          initialIndex={safeHeaderIndex}
          onClose={() => setShowPhotoGallery(false)}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  notFoundText: {
    ...type.body1,
    color: colors.greyNormal,
  },
  notFoundButton: {
    paddingHorizontal: 32,
  },
  hero: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
    backgroundColor: colors.accent2,
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
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
  photosPill: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: '#FCFBFC',
  },
  photosPillText: {
    ...type.footnote1,
    color: colors.ink,
    letterSpacing: -0.408,
  },
  identity: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.creamBorder,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    ...type.title1,
    flex: 1,
    fontSize: 24,
    lineHeight: 26.4,
    letterSpacing: -0.408,
    color: colors.ink,
  },
  infoBlock: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    ...type.body1,
    flex: 1,
    letterSpacing: -0.408,
    color: colors.ink,
  },
  openNow: {
    color: colors.openGreen,
  },
  amenityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  section: {
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.creamBorder,
  },
  amenityWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.background,
  },
});
