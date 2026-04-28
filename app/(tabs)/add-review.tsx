import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { X, Star, Camera, ChevronDown, Check } from 'lucide-react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { useReviews } from '../../context/ReviewContext';

const ATTRIBUTES = [
  { id: 'wifi', label: 'Has WiFi' },
  { id: 'ambient', label: 'Ambient' },
  { id: 'friendly-staff', label: 'Friendly Staff' },
  { id: 'ethical', label: 'Ethical' },
  { id: 'quiet', label: 'Quiet' },
  { id: 'fast-service', label: 'Fast Service' },
];

const sectionEntering = FadeInUp.springify().duration(250);
const sectionLayout = Layout.springify().duration(250);

function AnimatedSection({ children }: { children: React.ReactNode }) {
  return (
    <Animated.View entering={sectionEntering} layout={sectionLayout} style={styles.field}>
      {children}
    </Animated.View>
  );
}

export default function AddReviewScreen() {
  const { addReview } = useReviews();
  const params = useLocalSearchParams();
  const scrollRef = useRef<ScrollView>(null);
  const [selectedCafe, setSelectedCafe] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [orderedItem, setOrderedItem] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [likesCompleted, setLikesCompleted] = useState(false);
  const [notesCompleted, setNotesCompleted] = useState(false);
  const [photosCompleted, setPhotosCompleted] = useState(false);

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

  const showOrderSection = rating > 0;
  const showLikesSection = orderedItem.trim().length > 0;
  const showNotesSection = showLikesSection && likesCompleted;
  const showPhotoSection = showNotesSection && (notes.trim().length > 0 || notesCompleted);
  const showSubmitButton = showPhotoSection && (photos.length > 0 || photosCompleted);
  const canSubmit = Boolean(selectedCafe && rating > 0 && orderedItem.trim().length > 0);

  const visibleStepCount = [
    showOrderSection,
    showLikesSection,
    showNotesSection,
    showPhotoSection,
    showSubmitButton,
  ].filter(Boolean).length;

  useEffect(() => {
    if (visibleStepCount === 0) return;

    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);

    return () => clearTimeout(timer);
  }, [visibleStepCount]);

  const toggleAttribute = (attributeId: string) => {
    setSelectedAttributes((prev) => {
      if (prev.includes(attributeId)) {
        return prev.filter((id) => id !== attributeId);
      }

      if (prev.length >= 3) {
        return prev;
      }

      setLikesCompleted(true);
      return [...prev, attributeId];
    });
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newPhotos = result.assets.map((asset) => asset.uri);
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5));
      setPhotosCompleted(true);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNotesChange = (text: string) => {
    setNotes(text);
    if (text.trim().length > 0) {
      setNotesCompleted(true);
    }
  };

  const resetForm = () => {
    setSelectedCafe(null);
    setRating(0);
    setOrderedItem('');
    setNotes('');
    setSelectedAttributes([]);
    setPhotos([]);
    setLikesCompleted(false);
    setNotesCompleted(false);
    setPhotosCompleted(false);
    setDate(new Date());
  };

  const handleSubmit = async () => {
    if (!selectedCafe) {
      Alert.alert('Missing Information', 'Please select a cafe');
      return;
    }
    if (rating === 0) {
      Alert.alert('Missing Information', 'Please add a rating');
      return;
    }
    if (orderedItem.trim().length === 0) {
      Alert.alert('Missing Information', 'Please add what you ordered');
      return;
    }

    await addReview({
      cafeId: selectedCafe.id,
      rating,
      text: notes.trim(),
      orderedItem: orderedItem.trim(),
      attributes: selectedAttributes,
      photos,
    });
    Alert.alert('Success', 'Your review has been added!');

    resetForm();
    router.push('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FEFEFE" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Review</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.contextCard}>
          <Text style={styles.contextLabel}>Cafe visited</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => router.push('/search-cafes')}
            activeOpacity={0.85}
          >
            <Text style={selectedCafe ? styles.dropdownText : styles.dropdownPlaceholder}>
              {selectedCafe ? selectedCafe.name : 'Search for a cafe'}
            </Text>
            <ChevronDown size={20} color="#8E8E93" />
          </TouchableOpacity>

          <Text style={[styles.contextLabel, styles.dateLabel]}>Date</Text>
          <TouchableOpacity
            style={styles.dateDisplay}
            onPress={() => setShowDatePicker(!showDatePicker)}
            activeOpacity={0.85}
          >
            <Text style={styles.dateText}>
              {date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            <ChevronDown size={20} color="#8E8E93" />
          </TouchableOpacity>
          {showDatePicker && (
            <View style={styles.datePickerContainer}>
              <TextInput
                style={styles.dateInput}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#8E8E93"
                value={date.toLocaleDateString('en-US')}
                onChangeText={(text) => {
                  const newDate = new Date(text);
                  if (!isNaN(newDate.getTime())) {
                    setDate(newDate);
                  }
                }}
              />
              <View style={styles.dateQuickOptions}>
                <TouchableOpacity
                  style={styles.dateQuickButton}
                  onPress={() => {
                    setDate(new Date());
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.dateQuickButtonText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateQuickButton}
                  onPress={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    setDate(yesterday);
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.dateQuickButtonText}>Yesterday</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <AnimatedSection>
          <Text style={styles.stepEyebrow}>Rating</Text>
          <Text style={styles.stepTitle}>How was your experience?</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
                activeOpacity={0.8}
              >
                <Star
                  size={42}
                  color={star <= rating ? '#D4AF37' : '#E5E5EA'}
                  fill={star <= rating ? '#D4AF37' : 'transparent'}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            ))}
          </View>
        </AnimatedSection>

        {showOrderSection && (
          <AnimatedSection>
            <Text style={styles.stepEyebrow}>What Did You Order?</Text>
            <TextInput
              style={styles.singleLineInput}
              placeholder="Flat white, almond croissant..."
              placeholderTextColor="#9A9A9F"
              value={orderedItem}
              onChangeText={setOrderedItem}
              returnKeyType="done"
            />
          </AnimatedSection>
        )}

        {showLikesSection && (
          <AnimatedSection>
            <View style={styles.stepHeaderRow}>
              <View>
                <Text style={styles.stepEyebrow}>What Did You Like?</Text>
                <Text style={styles.stepHint}>Choose up to 3</Text>
              </View>
              <TouchableOpacity onPress={() => setLikesCompleted(true)} style={styles.skipButton}>
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.attributesContainer}>
              {ATTRIBUTES.map((attr) => {
                const isSelected = selectedAttributes.includes(attr.id);
                const isDisabled = !isSelected && selectedAttributes.length >= 3;

                return (
                  <TouchableOpacity
                    key={attr.id}
                    style={[
                      styles.attributeButton,
                      isSelected && styles.attributeButtonActive,
                      isDisabled && styles.attributeButtonDisabled,
                    ]}
                    onPress={() => toggleAttribute(attr.id)}
                    disabled={isDisabled}
                    activeOpacity={0.8}
                  >
                    {isSelected && <Check size={14} color="#FFFFFF" />}
                    <Text
                      style={[
                        styles.attributeText,
                        isSelected && styles.attributeTextActive,
                        isDisabled && styles.attributeTextDisabled,
                      ]}
                    >
                      {attr.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </AnimatedSection>
        )}

        {showNotesSection && (
          <AnimatedSection>
            <View style={styles.stepHeaderRow}>
              <View>
                <Text style={styles.stepEyebrow}>Notes</Text>
                <Text style={styles.stepHint}>Optional</Text>
              </View>
              <TouchableOpacity onPress={() => setNotesCompleted(true)} style={styles.skipButton}>
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.notesInput}
              placeholder="Anything memorable about the visit?"
              placeholderTextColor="#9A9A9F"
              value={notes}
              onChangeText={handleNotesChange}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </AnimatedSection>
        )}

        {showPhotoSection && (
          <AnimatedSection>
            <View style={styles.stepHeaderRow}>
              <View>
                <Text style={styles.stepEyebrow}>Upload Photo</Text>
                <Text style={styles.stepHint}>Optional</Text>
              </View>
              <TouchableOpacity onPress={() => setPhotosCompleted(true)} style={styles.skipButton}>
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.photosContainer}>
              {photos.map((photo, index) => (
                <View key={`${photo}-${index}`} style={styles.photoWrapper}>
                  <Image source={{ uri: photo }} style={styles.photoPreview} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                  >
                    <X size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 5 && (
                <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
                  <Camera size={26} color="#8E8E93" />
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </AnimatedSection>
        )}

        {showSubmitButton && (
          <Animated.View entering={sectionEntering} layout={sectionLayout}>
            <TouchableOpacity
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.9}
            >
              <Text style={[styles.submitButtonText, !canSubmit && styles.submitButtonTextDisabled]}>
                Continue
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    borderBottomColor: '#F4F1EA',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
  },
  contextCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#F2EEE6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 1,
  },
  contextLabel: {
    fontSize: 12,
    fontFamily: 'Lato-Bold',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  dateLabel: {
    marginTop: 16,
  },
  field: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F2EEE6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 1,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },
  stepEyebrow: {
    fontSize: 13,
    fontFamily: 'Lato-Bold',
    color: '#A37D19',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 24,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
    lineHeight: 32,
    marginBottom: 18,
  },
  stepHint: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F3EC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
    flex: 1,
  },
  dropdownPlaceholder: {
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    flex: 1,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F3EC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dateText: {
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
    flex: 1,
  },
  datePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginTop: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F2EEE6',
  },
  dateInput: {
    backgroundColor: '#F7F3EC',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  dateQuickOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  dateQuickButton: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dateQuickButtonText: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: '#FFFFFF',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  starButton: {
    paddingVertical: 6,
    paddingHorizontal: 3,
  },
  singleLineInput: {
    backgroundColor: '#F7F3EC',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 17,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
  },
  skipButton: {
    backgroundColor: '#F7F3EC',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  skipButtonText: {
    fontSize: 13,
    fontFamily: 'Lato-Bold',
    color: '#6B6257',
  },
  attributesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  attributeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F7F3EC',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#F2EEE6',
  },
  attributeButtonActive: {
    backgroundColor: '#1C1C1E',
    borderColor: '#1C1C1E',
  },
  attributeButtonDisabled: {
    opacity: 0.45,
  },
  attributeText: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: '#4B4741',
  },
  attributeTextActive: {
    color: '#FFFFFF',
  },
  attributeTextDisabled: {
    color: '#8E8E93',
  },
  notesInput: {
    backgroundColor: '#F7F3EC',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
    minHeight: 124,
    lineHeight: 22,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoWrapper: {
    position: 'relative',
  },
  photoPreview: {
    width: 86,
    height: 86,
    borderRadius: 18,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoButton: {
    width: 112,
    height: 86,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5DED2',
    borderStyle: 'dashed',
    backgroundColor: '#FBF8F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    fontSize: 12,
    fontFamily: 'Lato-Bold',
    color: '#8E8E93',
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 2,
  },
  submitButtonDisabled: {
    backgroundColor: '#E5E5EA',
    shadowOpacity: 0,
    elevation: 0,
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
