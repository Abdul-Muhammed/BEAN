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
  ActionSheetIOS,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { X, Camera, ChevronDown, ChevronUp, Check, Heart } from 'lucide-react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useReviews } from '../../context/ReviewContext';
import { colors } from '@/constants/theme';
import SwipeableBeanRating from '@/components/SwipeableBeanRating';

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
  const { addReview, toggleFavorite, isFavorited } = useReviews();
  const params = useLocalSearchParams();
  const scrollRef = useRef<ScrollView>(null);
  const [selectedCafe, setSelectedCafe] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [orderedItem, setOrderedItem] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [photos, setPhotos] = useState<{ uri: string; base64: string }[]>([]);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeStep, setActiveStep] = useState<ReviewStep | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
  const sectionsRevealed = rating > 0;
  const showOrderSection = sectionsRevealed;
  const showLikesSection = sectionsRevealed;
  const showNotesSection = sectionsRevealed;
  const showPhotoSection = sectionsRevealed;
  const favoriteCafeId = selectedCafe?.id ? String(selectedCafe.id) : null;
  const isLovedCafe = favoriteCafeId ? isFavorited(favoriteCafeId) : false;
  const canSubmit = Boolean(selectedCafe && rating > 0 && !submitting);

  const toggleStep = (step: ReviewStep) => {
    setShowDatePicker(false);
    setActiveStep((current) => (current === step ? null : step));
  };

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
    const wasZero = rating === 0;
    setShowDatePicker(false);
    setRating(nextRating);
    if (wasZero && !orderCompleted) {
      setActiveStep('order');
    }
  };

  const selectOrderItem = (item: string) => {
    setOrderedItem(item);
  };

  const toggleAttribute = (attributeId: string) => {
    setShowDatePicker(false);
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

  const addPhotoAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    const picked = assets
      .filter((asset) => asset.base64)
      .map((asset) => ({ uri: asset.uri, base64: asset.base64 as string }));
    setPhotos((prev) => [...prev, ...picked].slice(0, 5));
  };

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      addPhotoAssets(result.assets);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Camera permission needed',
        'Please enable camera access in Settings to take a photo.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      addPhotoAssets(result.assets);
    }
  };

  const addPhoto = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Take Photo', 'Choose from Library', 'Cancel'],
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) takePhoto();
          else if (index === 1) pickFromLibrary();
        }
      );
    } else {
      Alert.alert('Add Photo', undefined, [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickFromLibrary },
        { text: 'Cancel', style: 'cancel' },
      ]);
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
    setDate(new Date());
    setShowDatePicker(false);
    setSubmitting(false);
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleToggleFavorite = () => {
    if (!favoriteCafeId) return;
    toggleFavorite(favoriteCafeId);
  };

  // During onboarding this screen is pushed from the "Top Cafes" step, which
  // lives in the (onboarding) group. A plain router.back() gets absorbed by the
  // Tabs navigator and lands on the home tab, which the AuthGate then bounces to
  // the username screen. dismiss() pops the whole pushed (tabs) entry and reveals
  // the still-mounted top-cafes screen beneath it, preserving its loaded list.
  const leaveReview = () => {
    if (params.onboarding === '1') {
      if (router.canDismiss()) router.dismiss();
      else router.replace('/(onboarding)/top-cafes');
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!selectedCafe) {
      Alert.alert('Missing Information', 'Please select a cafe');
      return;
    }
    if (rating === 0) {
      Alert.alert('Missing Information', 'Please add a rating');
      return;
    }

    setSubmitting(true);
    try {
      await addReview({
        cafeId: selectedCafe.id,
        rating,
        text: notes.trim(),
        orderedItem: orderedItem.trim() || undefined,
        attributes: selectedAttributes,
        photos: photos.map((photo) => photo.uri),
        photoUploads: photos.map((photo) => ({ base64: photo.base64 })),
        visitDate: date,
      });
      Alert.alert('Success', 'Your review has been added!');

      resetForm();
      // During onboarding the user reviews cafes from the "Top Cafes" step;
      // return there (still mounted) so their progress updates, rather than
      // jumping to Home.
      if (params.onboarding === '1') {
        leaveReview();
      } else {
        router.push('/(tabs)/home');
      }
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

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => setShowDatePicker(false)}
      >
        <View style={styles.contextCard}>
          <Text style={styles.contextLabel}>Cafe visited</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => {
              setShowDatePicker(false);
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
            <>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerHint}>Pick a visit date</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  hitSlop={8}
                  activeOpacity={0.8}
                >
                  <Text style={styles.datePickerClose}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerWrap}>
                <DateTimePicker
                  value={date}
                  onChange={handleDateChange}
                  mode="date"
                  display="spinner"
                  themeVariant="light"
                  maximumDate={new Date()}
                  style={styles.datePickerWheel}
                />
              </View>
            </>
          )}
        </View>

        <AnimatedSection>
          <Text style={styles.stepEyebrow}>Rating</Text>
          <Text style={styles.stepTitle}>How was your experience?</Text>
          <View style={styles.ratingControlRow}>
            <View style={styles.ratingStarsBlock}>
              <SwipeableBeanRating
                rating={rating}
                onChange={handleRatingSelect}
                size={42}
              />
              {rating > 0 && (
                <Text style={styles.ratingValue}>{rating.toFixed(1)} / 5</Text>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.loveButton,
                isLovedCafe && styles.loveButtonActive,
                !favoriteCafeId && styles.loveButtonDisabled,
              ]}
              onPress={handleToggleFavorite}
              disabled={!favoriteCafeId}
              activeOpacity={0.85}
            >
              <Heart
                size={26}
                color={isLovedCafe ? colors.danger : colors.primary}
                fill={isLovedCafe ? colors.danger : 'transparent'}
              />
            </TouchableOpacity>
          </View>
        </AnimatedSection>

        {showOrderSection && (
          <AnimatedSection>
            {activeStep === 'order' ? (
              <>
                <TouchableOpacity
                  style={styles.expandedHeader}
                  onPress={() => toggleStep('order')}
                  activeOpacity={0.85}
                >
                  <View style={styles.collapsedStepText}>
                    <Text style={styles.stepEyebrow}>What Did You Order?</Text>
                    <Text style={styles.stepHint}>Choose one</Text>
                  </View>
                  <ChevronUp size={20} color={colors.mutedText} />
                </TouchableOpacity>
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
                <Text style={styles.orderOtherLabel}>Something else?</Text>
                <TextInput
                  style={styles.orderOtherInput}
                  placeholder="Type what you ordered"
                  placeholderTextColor={colors.mutedText}
                  value={ORDER_ITEMS.includes(orderedItem) ? '' : orderedItem}
                  onChangeText={setOrderedItem}
                  onFocus={() => setShowDatePicker(false)}
                  returnKeyType="done"
                />
              </>
            ) : (
              <TouchableOpacity
                style={styles.collapsedStep}
                onPress={() => toggleStep('order')}
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
                <TouchableOpacity
                  style={styles.expandedHeader}
                  onPress={() => toggleStep('likes')}
                  activeOpacity={0.85}
                >
                  <View style={styles.collapsedStepText}>
                    <Text style={styles.stepEyebrow}>What Did You Like?</Text>
                    <Text style={styles.stepHint}>Choose up to 3</Text>
                  </View>
                  <ChevronUp size={20} color={colors.mutedText} />
                </TouchableOpacity>

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

              </>
            ) : (
              <TouchableOpacity
                style={styles.collapsedStep}
                onPress={() => toggleStep('likes')}
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
                <TouchableOpacity
                  style={styles.expandedHeader}
                  onPress={() => toggleStep('notes')}
                  activeOpacity={0.85}
                >
                  <View style={styles.collapsedStepText}>
                    <Text style={styles.stepEyebrow}>Notes</Text>
                    <Text style={styles.stepHint}>Optional</Text>
                  </View>
                  <ChevronUp size={20} color={colors.mutedText} />
                </TouchableOpacity>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Anything memorable about the visit?"
                  placeholderTextColor={colors.mutedText}
                  value={notes}
                  onChangeText={handleNotesChange}
                  onFocus={() => setShowDatePicker(false)}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </>
            ) : (
              <TouchableOpacity
                style={styles.collapsedStep}
                onPress={() => toggleStep('notes')}
                activeOpacity={0.85}
              >
                <View style={styles.collapsedStepText}>
                  <Text style={styles.stepEyebrow}>Notes</Text>
                  <Text style={notes.trim().length > 0 ? styles.collapsedSummary : styles.stepHint}>
                    {notes.trim().length > 0 ? notes.trim() : 'Optional'}
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
                <TouchableOpacity
                  style={styles.expandedHeader}
                  onPress={() => toggleStep('photos')}
                  activeOpacity={0.85}
                >
                  <View style={styles.collapsedStepText}>
                    <Text style={styles.stepEyebrow}>Upload Photo</Text>
                    <Text style={styles.stepHint}>Optional</Text>
                  </View>
                  <ChevronUp size={20} color={colors.mutedText} />
                </TouchableOpacity>
                <View style={styles.photosContainer}>
                  {photos.map((photo, index) => (
                    <View key={`${photo.uri}-${index}`} style={styles.photoWrapper}>
                      <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => removePhoto(index)}
                      >
                        <X size={16} color={colors.white} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {photos.length < 5 && (
                    <TouchableOpacity style={styles.addPhotoButton} onPress={addPhoto}>
                      <Camera size={26} color={colors.mutedText} />
                      <Text style={styles.addPhotoText}>Add Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ) : (
              <TouchableOpacity
                style={styles.collapsedStep}
                onPress={() => toggleStep('photos')}
                activeOpacity={0.85}
              >
                <View style={styles.collapsedStepText}>
                  <Text style={styles.stepEyebrow}>Upload Photo</Text>
                  <Text style={photos.length > 0 ? styles.collapsedSummary : styles.stepHint}>
                    {photos.length > 0
                      ? `${photos.length} photo${photos.length === 1 ? '' : 's'} selected`
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
          onPress={leaveReview}
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
          <Text style={styles.continueButtonText}>
            {submitting ? 'Submitting...' : 'Submit'}
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
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 2,
  },
  datePickerHint: {
    fontSize: 13,
    fontFamily: 'Lato-Regular',
    color: colors.mutedText,
  },
  datePickerClose: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: colors.primary,
  },
  datePickerWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    marginTop: 10,
    overflow: 'hidden',
  },
  datePickerWheel: {
    height: 180,
    width: 310,
  },
  ratingControlRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  ratingStarsBlock: {
    alignItems: 'flex-start',
  },
  ratingValue: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: colors.goldText,
    marginTop: 10,
  },
  loveButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  loveButtonActive: {
    transform: [{ scale: 1.04 }],
  },
  loveButtonDisabled: {
    opacity: 0.45,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 8,
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
  orderOtherLabel: {
    fontSize: 13,
    fontFamily: 'Lato-Bold',
    color: colors.mutedText,
    marginTop: 18,
    marginBottom: 8,
  },
  orderOtherInput: {
    backgroundColor: colors.warmSurface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Lato-Regular',
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
