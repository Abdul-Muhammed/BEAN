import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import BeanLogo from '../../components/BeanLogo';
import ReviewForm, {
  type ReviewFormValues,
  type ReviewPhoto,
} from '../../components/ReviewForm';
import { useReviews } from '../../context/ReviewContext';
import { colors } from '@/constants/theme';

// Parse a bare 'YYYY-MM-DD' as a local date so it isn't shifted by timezone.
function parseVisitDate(value: string | undefined): Date {
  if (value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (match) {
      const [, y, m, d] = match;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export default function EditReviewScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { userReviews, loading, updateReview } = useReviews();
  const [submitting, setSubmitting] = useState(false);

  const reviewId = Array.isArray(id) ? id[0] : id;
  const review = useMemo(
    () => userReviews.find((entry) => entry.id === reviewId),
    [reviewId, userReviews]
  );

  const initialValues = useMemo(() => {
    if (!review) return undefined;
    const photos: ReviewPhoto[] = (review.photos || [])
      .filter(Boolean)
      .map((uri) => ({ uri }));
    return {
      rating: review.rating,
      orderedItem: review.orderedItem ?? '',
      notes: review.text ?? '',
      attributes: review.attributes ?? [],
      photos,
      date: parseVisitDate(review.visitDate),
    };
  }, [review]);

  const cafe = useMemo(
    () =>
      review
        ? { id: review.cafeId, name: review.cafeName, image: review.cafeImage }
        : null,
    [review]
  );

  if (loading && !review) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading review…</Text>
      </SafeAreaView>
    );
  }

  if (!review || !cafe) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <BeanLogo width={58} height={98} />
        <Text style={styles.emptyTitle}>Review not found</Text>
        <Text style={styles.emptySubtitle}>
          This review may still be syncing, or it may no longer be available.
        </Text>
        <TouchableOpacity style={styles.backHomeButton} onPress={() => router.back()}>
          <Text style={styles.backHomeButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleSubmit = async (values: ReviewFormValues) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const ok = await updateReview({
        reviewId: review.id,
        cafeId: review.cafeId,
        rating: values.rating,
        text: values.notes,
        orderedItem: values.orderedItem || undefined,
        attributes: values.attributes,
        // Keep already-uploaded photos (no base64); upload the freshly added ones.
        photos: values.photos.filter((p) => !p.base64).map((p) => p.uri),
        photoUploads: values.photos
          .filter((p) => p.base64)
          .map((p) => ({ base64: p.base64 as string })),
        visitDate: values.date,
      });

      if (ok) {
        router.back();
      } else {
        setSubmitting(false);
        Alert.alert('Update failed', 'We could not save your changes. Please try again.');
      }
    } catch (err) {
      setSubmitting(false);
      Alert.alert(
        'Update failed',
        err instanceof Error ? err.message : 'We could not save your changes.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Review</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ReviewForm
        cafe={cafe}
        cafeLocked
        initialValues={initialValues}
        submitting={submitting}
        cancelLabel="Cancel"
        submitLabel="Save"
        submittingLabel="Saving…"
        emphasizeSubmit
        onCancel={() => router.back()}
        onSubmit={handleSubmit}
      />
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.warmBorder,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'OtomanopeeOne-Regular',
    color: colors.primary,
  },
  headerSpacer: {
    width: 40,
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
});
