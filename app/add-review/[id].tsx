import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import StarRating from '../../components/StarRating';
import { useReviews } from '../../context/ReviewContext';

export default function AddReviewScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const { cafes, addReview } = useReviews();
  
  const cafe = cafes.find(c => c.id === id);

  if (!cafe) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Cafe not found</Text>
      </SafeAreaView>
    );
  }

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }
    
    if (reviewText.trim().length === 0) {
      Alert.alert('Review Required', 'Please write a review before submitting.');
      return;
    }

    addReview({
      cafeId: id as string,
      rating,
      text: reviewText.trim(),
    });

    router.back();
    
    
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FEFEFE" />
        
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1C1C1E" />
          </TouchableOpacity>
          <Text style={styles.title}>Add Review</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <Text style={styles.cafeName}>{cafe.name}</Text>
          <Text style={styles.cafeLocation}>{cafe.location}</Text>

          <View style={styles.ratingSection}>
            <Text style={styles.sectionTitle}>Your Rating</Text>
            <StarRating
              rating={rating}
              size={32}
              interactive={true}
              onRatingChange={setRating}
            />
          </View>

          <View style={styles.reviewSection}>
            <Text style={styles.sectionTitle}>Your Review</Text>
            <TextInput
              style={styles.reviewInput}
              placeholder="Share your experience at this cafe..."
              placeholderTextColor="#8E8E93"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={reviewText}
              onChangeText={setReviewText}
              blurOnSubmit={true}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (rating === 0 || reviewText.trim().length === 0) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={rating === 0 || reviewText.trim().length === 0}
          >
            <Text style={[
              styles.submitButtonText,
              (rating === 0 || reviewText.trim().length === 0) && styles.submitButtonTextDisabled
            ]}>
              Submit Review
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFEFE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  cafeName: {
    fontSize: 24,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  cafeLocation: {
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    marginBottom: 32,
  },
  ratingSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  reviewSection: {
    marginBottom: 32,
  },
  reviewInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
    minHeight: 120,
  },
  submitButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  submitButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#FFFFFF',
  },
  submitButtonTextDisabled: {
    color: '#8E8E93',
  },
});