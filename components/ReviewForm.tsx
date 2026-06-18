import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActionSheetIOS,
  Platform,
  Image,
} from 'react-native';
import { X, Camera, ChevronDown, ChevronUp, Check, Heart } from 'lucide-react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useReviews } from '../context/ReviewContext';
import { getCafeCategories, type CafeCategory } from '../lib/cafeCategories';
import { colors } from '@/constants/theme';
import SwipeableBeanRating from '@/components/SwipeableBeanRating';

type ReviewStep = 'order' | 'likes' | 'notes' | 'photos';

// A photo on the form: existing review photos arrive as a remote `uri` only,
// while freshly picked images also carry `base64` for upload.
export interface ReviewPhoto {
  uri: string;
  base64?: string;
}

export interface ReviewFormValues {
  rating: number;
  orderedItem: string;
  notes: string;
  attributes: string[];
  photos: ReviewPhoto[];
  date: Date;
}

export interface ReviewFormCafe {
  id: string;
  name: string;
  image?: string;
}

interface ReviewFormProps {
  cafe: ReviewFormCafe | null;
  /** When true, the cafe row is read-only (edit mode). */
  cafeLocked?: boolean;
  /** Opens the cafe picker (create mode). Ignored when cafeLocked. */
  onPressCafe?: () => void;
  initialValues?: Partial<ReviewFormValues>;
  cancelLabel?: string;
  submitLabel?: string;
  submittingLabel?: string;
  /** Give the submit button visual emphasis (70/30 split) — used by edit mode. */
  emphasizeSubmit?: boolean;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: ReviewFormValues) => void;
}

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

function StepEyebrow({ title }: { title: string }) {
  return (
    <Text style={styles.stepEyebrow}>
      {title} <Text style={styles.optionalTag}>(Optional)</Text>
    </Text>
  );
}

export default function ReviewForm({
  cafe,
  cafeLocked = false,
  onPressCafe,
  initialValues,
  cancelLabel = 'Cancel',
  submitLabel = 'Submit',
  submittingLabel = 'Submitting...',
  emphasizeSubmit = false,
  submitting,
  onCancel,
  onSubmit,
}: ReviewFormProps) {
  const { toggleFavorite, isFavorited } = useReviews();
  const scrollRef = useRef<ScrollView>(null);

  const [rating, setRating] = useState(initialValues?.rating ?? 0);
  const [orderedItem, setOrderedItem] = useState(initialValues?.orderedItem ?? '');
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>(
    initialValues?.attributes ?? []
  );
  const [photos, setPhotos] = useState<ReviewPhoto[]>(initialValues?.photos ?? []);
  const [date, setDate] = useState<Date>(initialValues?.date ?? new Date());
  const [likeCategories, setLikeCategories] = useState<CafeCategory[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeStep, setActiveStep] = useState<ReviewStep | null>(null);

  // Load the "What did you like?" options from the same cafe_categories table
  // used during onboarding, so the two stay in sync.
  useEffect(() => {
    let cancelled = false;
    getCafeCategories()
      .then((cats) => {
        if (!cancelled) setLikeCategories(cats);
      })
      .catch((err) => {
        console.warn('Failed to load like categories:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const orderCompleted = orderedItem.trim().length > 0;
  const sectionsRevealed = rating > 0;
  const favoriteCafeId = cafe?.id ? String(cafe.id) : null;
  const isLovedCafe = favoriteCafeId ? isFavorited(favoriteCafeId) : false;
  const canSubmit = Boolean(cafe && rating > 0 && !submitting);

  const toggleStep = (step: ReviewStep) => {
    setShowDatePicker(false);
    setActiveStep((current) => (current === step ? null : step));
  };

  const visibleStepCount = sectionsRevealed ? 4 : 0;

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

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleToggleFavorite = () => {
    if (!favoriteCafeId) return;
    toggleFavorite(favoriteCafeId);
  };

  const handleSubmitPress = () => {
    if (!canSubmit) return;
    onSubmit({
      rating,
      orderedItem: orderedItem.trim(),
      notes: notes.trim(),
      attributes: selectedAttributes,
      photos,
      date,
    });
  };

  return (
    <>
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
              if (cafeLocked) return;
              setShowDatePicker(false);
              onPressCafe?.();
            }}
            activeOpacity={cafeLocked ? 1 : 0.85}
            disabled={cafeLocked}
          >
            <Text style={cafe ? styles.dropdownText : styles.dropdownPlaceholder}>
              {cafe ? cafe.name : 'Search for a cafe'}
            </Text>
            {!cafeLocked && <ChevronDown size={20} color={colors.mutedText} />}
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

        {sectionsRevealed && (
          <AnimatedSection>
            {activeStep === 'order' ? (
              <>
                <TouchableOpacity
                  style={styles.expandedHeader}
                  onPress={() => toggleStep('order')}
                  activeOpacity={0.85}
                >
                  <View style={styles.collapsedStepText}>
                    <StepEyebrow title="What Did You Order?" />
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
                  <StepEyebrow title="What Did You Order?" />
                  <Text style={orderCompleted ? styles.collapsedSummary : styles.stepHint}>
                    {orderCompleted ? orderedItem : 'Choose what you had'}
                  </Text>
                </View>
                <ChevronDown size={20} color={colors.mutedText} />
              </TouchableOpacity>
            )}
          </AnimatedSection>
        )}

        {sectionsRevealed && (
          <AnimatedSection>
            {activeStep === 'likes' ? (
              <>
                <TouchableOpacity
                  style={styles.expandedHeader}
                  onPress={() => toggleStep('likes')}
                  activeOpacity={0.85}
                >
                  <View style={styles.collapsedStepText}>
                    <StepEyebrow title="What Did You Like?" />
                    <Text style={styles.stepHint}>Choose up to 3</Text>
                  </View>
                  <ChevronUp size={20} color={colors.mutedText} />
                </TouchableOpacity>

                <View style={styles.attributesContainer}>
                  {likeCategories.map((category) => {
                    const isSelected = selectedAttributes.includes(category.label);
                    const isDisabled = !isSelected && selectedAttributes.length >= 3;
                    return (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.attributeButton,
                          isSelected && styles.attributeButtonActive,
                          isDisabled && styles.attributeButtonDisabled,
                        ]}
                        onPress={() => toggleAttribute(category.label)}
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
                          {category.label}
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
                  <StepEyebrow title="What Did You Like?" />
                  <Text style={selectedAttributes.length > 0 ? styles.collapsedSummary : styles.stepHint}>
                    {selectedAttributes.length > 0
                      ? selectedAttributes.join(', ')
                      : 'Choose up to 3'}
                  </Text>
                </View>
                <ChevronDown size={20} color={colors.mutedText} />
              </TouchableOpacity>
            )}
          </AnimatedSection>
        )}

        {sectionsRevealed && (
          <AnimatedSection>
            {activeStep === 'notes' ? (
              <>
                <TouchableOpacity
                  style={styles.expandedHeader}
                  onPress={() => toggleStep('notes')}
                  activeOpacity={0.85}
                >
                  <View style={styles.collapsedStepText}>
                    <StepEyebrow title="Notes" />
                    <Text style={styles.stepHint}>Optional</Text>
                  </View>
                  <ChevronUp size={20} color={colors.mutedText} />
                </TouchableOpacity>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Anything memorable about the visit?"
                  placeholderTextColor={colors.mutedText}
                  value={notes}
                  onChangeText={setNotes}
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
                  <StepEyebrow title="Notes" />
                  <Text style={notes.trim().length > 0 ? styles.collapsedSummary : styles.stepHint}>
                    {notes.trim().length > 0 ? notes.trim() : 'Optional'}
                  </Text>
                </View>
                <ChevronDown size={20} color={colors.mutedText} />
              </TouchableOpacity>
            )}
          </AnimatedSection>
        )}

        {sectionsRevealed && (
          <AnimatedSection>
            {activeStep === 'photos' ? (
              <>
                <TouchableOpacity
                  style={styles.expandedHeader}
                  onPress={() => toggleStep('photos')}
                  activeOpacity={0.85}
                >
                  <View style={styles.collapsedStepText}>
                    <StepEyebrow title="Upload Photo" />
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
                  <StepEyebrow title="Upload Photo" />
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
          style={[styles.cancelButton, emphasizeSubmit && styles.cancelButtonNarrow]}
          onPress={onCancel}
          activeOpacity={0.85}
        >
          <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.continueButton,
            emphasizeSubmit && styles.continueButtonWide,
            !canSubmit && styles.continueButtonDisabled,
          ]}
          onPress={handleSubmitPress}
          disabled={!canSubmit}
          activeOpacity={0.9}
        >
          <Text style={styles.continueButtonText}>
            {submitting ? submittingLabel : submitLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
  optionalTag: {
    fontSize: 11,
    fontFamily: 'Lato-Regular',
    color: '#707070',
    textTransform: 'none',
    letterSpacing: 0,
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
  cancelButtonNarrow: {
    flex: 3,
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
  continueButtonWide: {
    flex: 7,
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
