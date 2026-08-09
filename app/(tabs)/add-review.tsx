import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useReviews } from '../../context/ReviewContext';
import { useToast } from '../../context/ToastContext';
import { colors } from '@/constants/theme';
import ReviewForm, { type ReviewFormValues } from '@/components/ReviewForm';

export default function AddReviewScreen() {
  const { addReview } = useReviews();
  const { showToast } = useToast();
  const params = useLocalSearchParams();
  const [selectedCafe, setSelectedCafe] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  // Bumping this remounts ReviewForm to clear its internal state after a submit.
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (params.cafeId && params.cafeName) {
      setSelectedCafe({
        id: params.cafeId,
        name: params.cafeName,
        image: params.cafeImage || '',
      });
    }
  }, [params.cafeId, params.cafeName, params.cafeImage]);

  useEffect(() => {
    if (params.selectedCafeId && params.selectedCafeName) {
      setSelectedCafe({
        id: params.selectedCafeId,
        name: params.selectedCafeName,
        image: params.selectedCafeImage || '',
      });
    }
  }, [params.selectedCafeId, params.selectedCafeName, params.selectedCafeImage]);

  const openCafePicker = () => {
    router.push({
      pathname: '/search-cafes',
      params: { mode: 'review' },
    });
  };

  const leaveReview = () => {
    router.back();
  };

  const handleSubmit = async (values: ReviewFormValues) => {
    if (submitting) return;
    if (!selectedCafe) {
      Alert.alert('Missing Information', 'Please select a cafe');
      return;
    }
    if (values.rating === 0) {
      Alert.alert('Missing Information', 'Please add a rating');
      return;
    }

    setSubmitting(true);
    try {
      const reviewId = await addReview({
        cafeId: selectedCafe.id,
        rating: values.rating,
        text: values.notes,
        orderedItem: values.orderedItem || undefined,
        attributes: values.attributes,
        photos: values.photos.map((photo) => photo.uri),
        photoUploads: values.photos
          .filter((photo) => photo.base64)
          .map((photo) => ({ base64: photo.base64 as string })),
        visitDate: values.date,
      });

      setSelectedCafe(null);
      setFormKey((k) => k + 1);

      router.push('/(tabs)/home');
      showToast({
        message: 'Logged to your diary!',
        actionLabel: 'View',
        onAction: () => {
          if (reviewId) router.push(`/diary/${reviewId}`);
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Review</Text>
      </View>

      <ReviewForm
        key={formKey}
        cafe={selectedCafe}
        onPressCafe={openCafePicker}
        submitting={submitting}
        cancelLabel="Cancel"
        submitLabel="Submit"
        submittingLabel="Submitting..."
        onCancel={leaveReview}
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
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.warmBorder,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'OtomanopeeOne-Regular',
    color: colors.primary,
  },
});
