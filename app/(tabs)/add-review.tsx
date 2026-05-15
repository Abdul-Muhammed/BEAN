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
import { colors } from '@/constants/theme';

type ReviewStep = 'order' | 'likes' | 'notes' | 'photos';

const ATTRIBUTES = [
  { id: 'wifi', label: 'Has WiFi' },
  { id: 'ambient', label: 'Ambient' },
  { id: 'friendly-staff', label: 'Friendly Staff' },
  { id: 'ethical', label: 'Ethical' },
  { id: 'quiet', label: 'Quiet' },
  { id: 'fast-service', label: 'Fast Service' },
];

const ORDER_ITEMS = [
  'Flat White',
  'Latte',
  'Long Black',
  'Cappuccino',
  'Espresso',
  'Mocha',
  'Cold Brew',
  'Filter Coffee',
  'Matcha',
  'Tea',
  'Pastry',
  'Brunch',
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
  const [activeStep, setActiveStep] = useState<ReviewStep | null>(null);
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

  const orderCompleted = orderedItem.trim().length > 0;
  const notesStepCompleted = notes.trim().length > 0 || notesCompleted;
  const showOrderSection = rating > 0;
  const showLikesSection = orderCompleted;
  const showNotesSection = likesCompleted;
  const showPhotoSection = notesStepCompleted;
  const canSubmit = Boolean(selectedCafe && rating > 0 && orderCompleted);

  const visibleStepCount = [
    showOrderSection,
    showLikesSection,
    showNotesSection,
    showPhotoSection,
  ].filter(Boolean).length;

  useEffect(() => {
    if (visibleStepCount === 0) return;

    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);

    return () => clearTimeout(timer);
  }, [visibleStepCount]);

  const handleRatingSelect = (nextRating: number) => {
    setRating(nextRating);
    if (!orderCompleted) {
      setActiveStep('order');
    }
  };

  const selectOrderItem = (item: string) => {
    setOrderedItem(item);
    setActiveStep('likes');
  };

  const completeLikesStep = () => {
    setLikesCompleted(true);
    setActiveStep('notes');
  };

  const completeNotesStep = () => {
    setNotesCompleted(true);
    setActiveStep('photos');
  };

  const completePhotosStep = () => {
    setPhotosCompleted(true);
    setActiveStep(null);
  };

  const toggleAttribute = (attributeId: string) => {
    setSelectedAttributes((prev) => {
      if (prev.includes(attributeId)) {
        return prev.filter((id) => id !== attributeId);
      }

      if (prev.length >= 3) {
        return prev;
      }

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
      completePhotosStep();
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNotesChange = (text: string) => {
    setNotes(text);
  };

  const resetForm = () => {
    setSelectedCafe(null);
    setRating(0);
    setOrderedItem('');
    setNotes('');
    setSelectedAttributes([]);
    setPhotos([]);
    setActiveStep(null);
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
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Review</Text>
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
            onPress={() => {
              router.push({
                pathname: '/search-cafes',
                params: { mode: 'review' },
              });
            }}
            activeOpacity={0.85}
          >
            <Text style={selectedCafe ? styles.dropdownText : styles.dropdownPlaceholder}>
              {selectedCafe ? selectedCafe.name : 'Search for a cafe'}
            </Text>
            <ChevronDown size={20} color={colors.mutedText} />
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
            <ChevronDown size={20} color={colors.mutedText} />
          </TouchableOpacity>
          {showDatePicker && (
            <View style={styles.datePickerContainer}>
              <TextInput
                style={styles.dateInput}
                placeholder="MM/DD/YYYY"
                placeholderTextColor={colors.mutedText}
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
                onPress={() => handleRatingSelect(star)}
                style={styles.starButton}
                activeOpacity={0.8}
              >
                <Star
                  size={42}
                  color={star <= rating ? colors.gold : colors.disabled}
                  fill={star <= rating ? colors.gold : 'transparent'}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            ))}
          </View>
        </AnimatedSection>

        {showOrderSection && (
          <AnimatedSection>
            {activeStep === 'order' ? (
              <>
                <Text style={styles.stepEyebrow}>What Did You Order?</Text>
                <Text style={styles.stepHint}>Choose one</Text>
                <View style={styles.orderPillsContainer}>
                  {ORDER_ITEMS.map((item) => {
                    const isSelected = orderedItem === item;

                    return (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.attributeButton,
                          isSelected && styles.attributeButtonActive,
                        ]}
                        onPress={() => selectOrderItem(item)}
                        activeOpacity={0.8}
                      >
                        {isSelected && <Check size={14} color={colors.white} />}
                        <Text
                          style={[
                            styles.attributeText,
                            isSelected && styles.attributeTextActive,
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : (
              <TouchableOpacity
                style={styles.collapsedStep}
                onPress={() => setActiveStep('order')}
                activeOpacity={0.85}
              >
                <View style={styles.collapsedStepText}>
                  <Text style={styles.stepEyebrow}>What Did You Order?</Text>
                  <Text style={orderCompleted ? styles.collapsedSummary : styles.stepHint}>
                    {orderCompleted ? orderedItem : 'Choose what you had'}
                  </Text>
                </View>
                <ChevronDown size={20} color={colors.mutedText} />
              </TouchableOpacity>
            )}
          </AnimatedSection>
        )}

        {showLikesSection && (
          <AnimatedSection>
            {activeStep === 'likes' ? (
              <>
                <View style={styles.stepHeaderRow}>
                  <View>
                    <Text style={styles.stepEyebrow}>What Did You Like?</Text>
                    <Text style={styles.stepHint}>Choose up to 3</Text>
                  </View>
                  <TouchableOpacity onPress={completeLikesStep} style={styles.skipButton}>
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
                        {isSelected && <Check size={14} color={colors.white} />}
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

                {selectedAttributes.length > 0 && (
                  <TouchableOpacity
                    onPress={completeLikesStep}
                    style={styles.stepContinueButton}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.stepContinueButtonText}>Continue</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <TouchableOpacity
                style={styles.collapsedStep}
                onPress={() => setActiveStep('likes')}
                activeOpacity={0.85}
              >
                <View style={styles.collapsedStepText}>
                  <Text style={styles.stepEyebrow}>What Did You Like?</Text>
                  <Text style={selectedAttributes.length > 0 ? styles.collapsedSummary : styles.stepHint}>
                    {selectedAttributes.length > 0
                      ? selectedAttributes
                          .map((id) => ATTRIBUTES.find((attr) => attr.id === id)?.label)
                          .filter(Boolean)
                          .join(', ')
                      : likesCompleted
                        ? 'Skipped'
                        : 'Choose up to 3'}
                  </Text>
                </View>
                <ChevronDown size={20} color={colors.mutedText} />
              </TouchableOpacity>
            )}
          </AnimatedSection>
        )}

        {showNotesSection && (
          <AnimatedSection>
            {activeStep === 'notes' ? (
              <>
                <View style={styles.stepHeaderRow}>
                  <View>
                    <Text style={styles.stepEyebrow}>Notes</Text>
                    <Text style={styles.stepHint}>Optional</Text>
                  </View>
                  <TouchableOpacity onPress={completeNotesStep} style={styles.skipButton}>
                    <Text style={styles.skipButtonText}>Skip</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Anything memorable about the visit?"
                  placeholderTextColor={colors.mutedText}
                  value={notes}
                  onChangeText={handleNotesChange}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                {notes.trim().length > 0 && (
                  <TouchableOpacity
                    onPress={completeNotesStep}
                    style={styles.stepContinueButton}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.stepContinueButtonText}>Continue</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <TouchableOpacity
                style={styles.collapsedStep}
                onPress={() => setActiveStep('notes')}
                activeOpacity={0.85}
              >
                <View style={styles.collapsedStepText}>
                  <Text style={styles.stepEyebrow}>Notes</Text>
                  <Text style={notes.trim().length > 0 ? styles.collapsedSummary : styles.stepHint}>
                    {notes.trim().length > 0 ? notes.trim() : notesCompleted ? 'Skipped' : 'Optional'}
                  </Text>
                </View>
                <ChevronDown size={20} color={colors.mutedText} />
              </TouchableOpacity>
            )}
          </AnimatedSection>
        )}

        {showPhotoSection && (
          <AnimatedSection>
            {activeStep === 'photos' ? (
              <>
                <View style={styles.stepHeaderRow}>
                  <View>
                    <Text style={styles.stepEyebrow}>Upload Photo</Text>
                    <Text style={styles.stepHint}>Optional</Text>
                  </View>
                  <TouchableOpacity onPress={completePhotosStep} style={styles.skipButton}>
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
                        <X size={16} color={colors.white} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {photos.length < 5 && (
                    <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
                      <Camera size={26} color={colors.mutedText} />
                      <Text style={styles.addPhotoText}>Add Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ) : (
              <TouchableOpacity
                style={styles.collapsedStep}
                onPress={() => setActiveStep('photos')}
                activeOpacity={0.85}
              >
                <View style={styles.collapsedStepText}>
                  <Text style={styles.stepEyebrow}>Upload Photo</Text>
                  <Text style={photos.length > 0 ? styles.collapsedSummary : styles.stepHint}>
                    {photos.length > 0
                      ? `${photos.length} photo${photos.length === 1 ? '' : 's'} selected`
                      : photosCompleted
                        ? 'Skipped'
                        : 'Optional'}
                  </Text>
                </View>
                <ChevronDown size={20} color={colors.mutedText} />
              </TouchableOpacity>
            )}
          </AnimatedSection>
        )}

      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.continueButton, !canSubmit && styles.continueButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.9}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 140,
  },
  contextCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.warmBorder,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 1,
  },
  contextLabel: {
    fontSize: 12,
    fontFamily: 'Lato-Bold',
    color: colors.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  dateLabel: {
    marginTop: 16,
  },
  field: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.warmBorder,
    shadowColor: colors.black,
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
    color: colors.goldText,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 24,
    fontFamily: 'OtomanopeeOne-Regular',
    color: colors.primary,
    lineHeight: 32,
    marginBottom: 18,
  },
  stepHint: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: colors.mutedText,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warmSurface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: colors.primary,
    flex: 1,
  },
  dropdownPlaceholder: {
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: colors.mutedText,
    flex: 1,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warmSurface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dateText: {
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: colors.primary,
    flex: 1,
  },
  datePickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    marginTop: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.warmBorder,
  },
  dateInput: {
    backgroundColor: colors.warmSurface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: colors.primary,
    marginBottom: 12,
  },
  dateQuickOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  dateQuickButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dateQuickButtonText: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: colors.white,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  starButton: {
    paddingVertical: 6,
    paddingHorizontal: 3,
  },
  collapsedStep: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  collapsedStepText: {
    flex: 1,
  },
  collapsedSummary: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: colors.primary,
  },
  orderPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  skipButton: {
    backgroundColor: colors.warmSurface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  skipButtonText: {
    fontSize: 13,
    fontFamily: 'Lato-Bold',
    color: colors.primary,
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
    backgroundColor: colors.warmSurface,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.warmBorder,
  },
  attributeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  attributeButtonDisabled: {
    opacity: 0.45,
  },
  attributeText: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: colors.primary,
  },
  attributeTextActive: {
    color: colors.white,
  },
  attributeTextDisabled: {
    color: colors.mutedText,
  },
  stepContinueButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  stepContinueButtonText: {
    fontSize: 15,
    fontFamily: 'Lato-Bold',
    color: colors.white,
  },
  notesInput: {
    backgroundColor: colors.warmSurface,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: colors.primary,
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
    backgroundColor: colors.danger,
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
    borderColor: colors.warmBorder,
    borderStyle: 'dashed',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    fontSize: 12,
    fontFamily: 'Lato-Bold',
    color: colors.mutedText,
    marginTop: 6,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.warmBorder,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.black,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: colors.black,
  },
  continueButton: {
    flex: 1,
    backgroundColor: colors.black,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.45,
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: colors.white,
  },
});
