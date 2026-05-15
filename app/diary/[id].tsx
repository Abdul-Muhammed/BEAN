import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  Coffee,
  ExternalLink,
  FileText,
  Heart,
  Tag,
} from 'lucide-react-native';
import BeanLogo from '../../components/BeanLogo';
import PhotoGallery from '../../components/PhotoGallery';
import StarRating from '../../components/StarRating';
import { useReviews } from '../../context/ReviewContext';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_THUMB_SIZE = (SCREEN_WIDTH - 82) / 2;

interface DetailSectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function DetailSection({ icon, title, children }: DetailSectionProps) {
  return (
    <View style={styles.detailCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>{icon}</View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function DiaryEntryScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { userReviews, loading, getCafeById, addCafe, isFavorited } = useReviews();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  const reviewId = Array.isArray(id) ? id[0] : id;
  const review = useMemo(
    () => userReviews.find((entry) => entry.id === reviewId),
    [reviewId, userReviews]
  );

  const photos = review?.photos?.filter(Boolean) || [];
  const attributes = review?.attributes?.filter(Boolean) || [];

  const handleViewCafe = () => {
    if (!review) return;

    const cafe = getCafeById(review.cafeId);
    if (cafe) {
      addCafe(cafe);
    }

    router.push({
      pathname: '/cafe/[id]',
      params: { id: review.cafeId },
    });
  };

  if (loading && !review) {
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.topBarText}>
          <Text style={styles.screenTitle}>Diary Entry</Text>
          <Text style={styles.screenSubtitle}>{review.date}</Text>
        </View>
        <View style={styles.iconButtonPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          {review.cafeImage ? (
            <Image source={{ uri: review.cafeImage }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, styles.heroImageFallback]}>
              <BeanLogo width={42} height={70} color={colors.white} />
            </View>
          )}

          <View style={styles.heroContent}>
            <View style={styles.heroTitleRow}>
              <Text style={styles.cafeName} numberOfLines={2}>
                {review.cafeName}
              </Text>
              {isFav && <Heart size={18} color={colors.danger} fill={colors.danger} />}
            </View>

            <View style={styles.ratingRow}>
              <StarRating rating={review.rating} size={18} />
              <Text style={styles.ratingText}>{review.rating.toFixed(1)}</Text>
            </View>

            <Text style={styles.visitDate}>Visited {review.date}</Text>

            <TouchableOpacity
              style={styles.viewCafeButton}
              onPress={handleViewCafe}
              activeOpacity={0.88}
            >
              <Text style={styles.viewCafeButtonText}>View cafe</Text>
              <ExternalLink size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        <DetailSection
          icon={<Coffee size={18} color={colors.goldText} />}
          title="What you ordered"
        >
          <Text style={review.orderedItem ? styles.primaryDetailText : styles.mutedDetailText}>
            {review.orderedItem || 'No order added'}
          </Text>
        </DetailSection>

        <DetailSection icon={<FileText size={18} color={colors.goldText} />} title="Your notes">
          <Text style={review.text ? styles.notesText : styles.mutedDetailText}>
            {review.text || 'No notes added for this visit.'}
          </Text>
        </DetailSection>

        {attributes.length > 0 && (
          <DetailSection icon={<Tag size={18} color={colors.goldText} />} title="What stood out">
            <View style={styles.tagList}>
              {attributes.map((attribute) => (
                <View key={attribute} style={styles.tag}>
                  <Text style={styles.tagText}>{attribute}</Text>
                </View>
              ))}
            </View>
          </DetailSection>
        )}

        <DetailSection icon={<Camera size={18} color={colors.goldText} />} title="Photos">
          {photos.length > 0 ? (
            <View style={styles.photoGrid}>
              {photos.map((photo, index) => (
                <TouchableOpacity
                  key={`${photo}-${index}`}
                  style={styles.photoThumbButton}
                  onPress={() => setSelectedPhotoIndex(index)}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: photo }} style={styles.photoThumb} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.mutedDetailText}>No photos added for this visit.</Text>
          )}
        </DetailSection>
      </ScrollView>

      {selectedPhotoIndex !== null && (
        <PhotoGallery
          key={`review-photos-${selectedPhotoIndex}`}
          photos={photos}
          visible={selectedPhotoIndex !== null}
          initialIndex={selectedPhotoIndex}
          onClose={() => setSelectedPhotoIndex(null)}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconButtonPlaceholder: {
    width: 42,
    height: 42,
  },
  topBarText: {
    flex: 1,
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontFamily: 'OtomanopeeOne-Regular',
    color: colors.primary,
  },
  screenSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: 'Lato-Bold',
    color: colors.goldText,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  heroCard: {
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  heroImage: {
    width: '100%',
    height: 210,
    backgroundColor: colors.disabled,
  },
  heroImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  heroContent: {
    padding: 18,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cafeName: {
    flex: 1,
    fontSize: 24,
    fontFamily: 'OtomanopeeOne-Regular',
    lineHeight: 31,
    color: colors.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: '#4CAF50',
  },
  visitDate: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: colors.mutedText,
  },
  viewCafeButton: {
    marginTop: 18,
    height: 48,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
  },
  viewCafeButtonText: {
    fontSize: 15,
    fontFamily: 'Lato-Bold',
    color: colors.white,
  },
  detailCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warmSurface,
    borderWidth: 1,
    borderColor: colors.warmBorder,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: colors.primary,
  },
  primaryDetailText: {
    fontSize: 17,
    fontFamily: 'Lato-Bold',
    color: colors.primary,
  },
  mutedDetailText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    lineHeight: 20,
    color: colors.mutedText,
  },
  notesText: {
    fontSize: 15,
    fontFamily: 'Lato-Regular',
    lineHeight: 23,
    color: '#3A3A3C',
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.warmSurface,
    borderWidth: 1,
    borderColor: colors.warmBorder,
  },
  tagText: {
    fontSize: 13,
    fontFamily: 'Lato-Bold',
    color: colors.goldText,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoThumbButton: {
    width: PHOTO_THUMB_SIZE,
    height: PHOTO_THUMB_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.disabled,
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
});
