import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  type DimensionValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ArrowLeft, MapPin, Search, Check } from 'lucide-react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { CoffeeBean } from '../../components/BeanRating';
import { useReviews } from '../../context/ReviewContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import { updateProfile } from '../../lib/profile';
import { approximateDistanceMeters, formatDistance } from '../../lib/geo';
import {
  searchCafesNearbyByCoords,
  searchCafesNearby,
  convertPlaceToCafe,
  isNzCafe,
} from '../../services/googlePlaces';
import { colors } from '@/constants/theme';

const REQUIRED_REVIEWS = 3;
const MAX_CAFES = 12;

// Selection palette (per the onboarding spec). The rest of the screen uses the
// app's near-black onboarding theme.
const SELECTED_BORDER = '#2E7D32';
const SELECTED_TINT = '#EAF6EC';

// Trim a full address down to a readable suburb/area label.
function extractSuburb(address: string): string {
  if (!address) return '';
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[1];
  return parts[0] ?? address;
}

interface OnboardingCafe {
  id: string;
  name: string;
  location: string;
  rating: number;
  image: string;
  amenities?: string[];
  latitude?: number;
  longitude?: number;
}

export default function TopCafesScreen() {
  const router = useRouter();
  const { username, location, latitude, longitude, preferences } =
    useLocalSearchParams<{
      username?: string;
      location?: string;
      latitude?: string;
      longitude?: string;
      preferences?: string;
    }>();
  const { userReviews, addCafe } = useReviews();
  const { refetch: refetchProfile } = useUserProfile();

  const [cafes, setCafes] = useState<OnboardingCafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const coords = useMemo(() => {
    const lat = latitude ? parseFloat(latitude) : NaN;
    const lng = longitude ? parseFloat(longitude) : NaN;
    return Number.isFinite(lat) && Number.isFinite(lng)
      ? { latitude: lat, longitude: lng }
      : null;
  }, [latitude, longitude]);

  // Cafes the user has reviewed count toward onboarding completion. A fresh
  // onboarding user starts with zero reviews, so this set grows as they review.
  const reviewedIds = useMemo(
    () => new Set(userReviews.map((r) => String(r.cafeId))),
    [userReviews]
  );
  const reviewedCount = Math.min(reviewedIds.size, REQUIRED_REVIEWS);
  const isComplete = reviewedCount >= REQUIRED_REVIEWS;

  // Load the nearby top-rated cafes once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const places = coords
          ? await searchCafesNearbyByCoords(coords.latitude, coords.longitude)
          : location
            ? await searchCafesNearby(location)
            : [];
        const converted = await Promise.all(places.map((p) => convertPlaceToCafe(p)));
        const top = converted
          .filter(isNzCafe)
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
          .slice(0, MAX_CAFES);
        if (!cancelled) setCafes(top);
      } catch (err) {
        console.warn('Failed to load nearby cafes:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coords, location]);

  // Open the shared, dedicated search page (same nested-page UX as the rest of
  // the app) rather than searching inline. The onboarding flag is forwarded so
  // the review screen knows to return here when done.
  const openSearch = () => {
    router.push({
      pathname: '/search-cafes',
      params: { mode: 'review', onboarding: '1' },
    });
  };

  const handleSelectCafe = (cafe: OnboardingCafe) => {
    if (reviewedIds.has(cafe.id)) return; // already reviewed during onboarding
    // Mirror search-cafes: let ReviewContext know the cafe before reviewing it.
    addCafe({
      id: cafe.id,
      name: cafe.name,
      location: cafe.location,
      rating: cafe.rating,
      image: cafe.image,
      description: cafe.location ? `A cafe located at ${cafe.location}.` : '',
      reviews: [],
      place_id: cafe.id,
      photos: [cafe.image],
    } as any);
    router.push({
      pathname: '/(tabs)/add-review',
      params: {
        cafeId: cafe.id,
        cafeName: cafe.name,
        cafeImage: cafe.image || '',
        onboarding: '1',
      },
    });
  };

  const completeOnboarding = useCallback(async () => {
    if (submitting) return;
    const trimmedUsername = (username ?? '').trim();
    if (!trimmedUsername || trimmedUsername.length < 4) {
      Alert.alert(
        'Invalid Username',
        'Please ensure you have selected a valid username (at least 4 characters).'
      );
      return;
    }

    setSubmitting(true);
    try {
      const parsedLat = latitude ? parseFloat(latitude) : NaN;
      const parsedLng = longitude ? parseFloat(longitude) : NaN;
      await updateProfile({
        username: trimmedUsername,
        location: location ?? null,
        latitude: Number.isFinite(parsedLat) ? parsedLat : null,
        longitude: Number.isFinite(parsedLng) ? parsedLng : null,
        preferences: (preferences ?? '').split(',').filter(Boolean),
        onboardingCompleted: true,
      });
      // Refresh the shared profile so the AuthGate guard sees
      // onboarding_completed: true before we land on Home — otherwise its stale
      // copy would bounce us back to the username screen.
      await refetchProfile();
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Onboarding error:', error);
      Alert.alert(
        'Setup Error',
        error instanceof Error
          ? error.message
          : 'There was an error setting up your profile. Please try again.'
      );
      setSubmitting(false);
    }
  }, [submitting, username, location, latitude, longitude, preferences, router, refetchProfile]);

  // Returning from the review screen re-focuses this one; nothing to refetch
  // (reviewedIds is derived from context), but keep the hook for clarity.
  useFocusEffect(useCallback(() => {}, []));

  const progressPct: DimensionValue = `${(reviewedCount / REQUIRED_REVIEWS) * 100}%`;

  const renderCard = (cafe: OnboardingCafe, index: number) => {
    const isSelected = reviewedIds.has(cafe.id);
    const suburb = extractSuburb(cafe.location);
    const distance =
      coords && typeof cafe.latitude === 'number' && typeof cafe.longitude === 'number'
        ? formatDistance(
            approximateDistanceMeters(
              coords.latitude,
              coords.longitude,
              cafe.latitude,
              cafe.longitude
            )
          )
        : '';
    const tags = (cafe.amenities ?? []).slice(0, 3);

    return (
      <Animated.View
        key={cafe.id}
        entering={FadeInUp.springify().duration(280).delay(Math.min(index, 8) * 35)}
        layout={Layout.springify().duration(220)}
      >
        <TouchableOpacity
          style={[styles.card, isSelected && styles.cardSelected]}
          onPress={() => handleSelectCafe(cafe)}
          activeOpacity={0.85}
          disabled={isSelected}
        >
          <Image source={{ uri: cafe.image }} style={styles.thumbnail} />

          <View style={styles.cardContent}>
            <Text style={styles.cafeName} numberOfLines={1}>
              {cafe.name}
            </Text>
            <View style={styles.locationRow}>
              <MapPin size={13} color={colors.mutedText} />
              <Text style={styles.locationText} numberOfLines={1}>
                {suburb}
                {distance ? ` · ${distance}` : ''}
              </Text>
            </View>
            {tags.length > 0 && (
              <View style={styles.tagRow}>
                {tags.map((tag) => (
                  <View key={tag} style={styles.tagPill}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.cardRight}>
            {isSelected ? (
              <View style={styles.checkBadge}>
                <Check size={16} color={colors.white} strokeWidth={3} />
              </View>
            ) : (
              <View style={styles.ratingPill}>
                <CoffeeBean size={15} />
                <Text style={styles.ratingText}>{(cafe.rating ?? 0).toFixed(1)}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <ArrowLeft size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <TouchableOpacity onPress={completeOnboarding} hitSlop={8} disabled={submitting}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: progressPct }]} />
        </View>
        <Text style={styles.progressLabel}>{reviewedCount}/{REQUIRED_REVIEWS}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Top Cafes In Your Area</Text>
        <Text style={styles.subtitle}>
          Quickly log three cafes that you&apos;ve been to get started!
        </Text>

        {/* Search */}
        <Text style={styles.searchLabel}>Search for a Cafe</Text>
        <TouchableOpacity
          style={styles.searchInputWrap}
          onPress={openSearch}
          activeOpacity={0.7}
        >
          <Search size={18} color={colors.mutedText} />
          <Text style={styles.searchPlaceholder}>e.g. Patch Cafe</Text>
        </TouchableOpacity>

        {/* List */}
        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.stateText}>Finding cafes near you…</Text>
          </View>
        ) : cafes.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>
              No nearby cafes found. Try searching above.
            </Text>
          </View>
        ) : (
          cafes.map((cafe, index) => renderCard(cafe, index))
        )}
      </ScrollView>

      {/* Sticky footer CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cta, !isComplete && styles.ctaDisabled]}
          onPress={completeOnboarding}
          disabled={!isComplete || submitting}
          activeOpacity={0.9}
        >
          <Text style={[styles.ctaText, !isComplete && styles.ctaTextDisabled]}>
            {submitting
              ? 'Setting up…'
              : isComplete
                ? 'Continue'
                : `${reviewedCount}/${REQUIRED_REVIEWS} Selected`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: colors.mutedText,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 13,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#111111',
    marginTop: 8,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Lato-Regular',
    color: '#666666',
    lineHeight: 22,
    marginBottom: 24,
  },
  searchLabel: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: '#111111',
    marginBottom: 10,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingBottom: 8,
    marginBottom: 20,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: colors.mutedText,
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 48,
  },
  stateText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: colors.mutedText,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardSelected: {
    borderColor: SELECTED_BORDER,
    borderWidth: 2,
    backgroundColor: SELECTED_TINT,
  },
  thumbnail: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: 'center',
    gap: 6,
  },
  cafeName: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#111111',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Lato-Regular',
    color: '#666666',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 11,
    fontFamily: 'Lato-Regular',
    color: '#666666',
  },
  cardRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: '#111111',
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SELECTED_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  cta: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaDisabled: {
    backgroundColor: '#E5E5EA',
  },
  ctaText: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#FFFFFF',
  },
  ctaTextDisabled: {
    color: '#8E8E93',
  },
});
