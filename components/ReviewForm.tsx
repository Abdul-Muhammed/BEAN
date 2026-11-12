import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';
import { X } from 'lucide-react-native';
import Animated, { FadeIn, FadeInUp, Layout } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  KeyboardAwareScrollView,
  useKeyboardController,
} from 'react-native-keyboard-controller';
import { useReviews } from '../context/ReviewContext';
import { useLocation } from '../hooks/useLocation';
import { getCafeCategories, type CafeCategory } from '../lib/cafeCategories';
import { distanceLabelFor, extractLocation } from '../lib/geo';
import { colors, radius, spacing, type } from '@/constants/theme';
import {
  CHECK_12_CREAM_SVG,
  CHEVRON_DOWN_16_SVG,
  HEART_40_FILLED_SVG,
  HEART_40_SVG,
  MAP_PIN_12_SVG,
  PENCIL_SVG,
  PLUS_16_SVG,
  SEARCH_16_SVG,
} from '@/constants/figmaIcons';
import SwipeableBeanRating from '@/components/SwipeableBeanRating';
import Tag from '@/components/ui/Tag';

/**
 * The Log a Visit form shared by Add Review and Edit Review.
 * Figma: file rj73f43oVHWbM7N9VhmVeP, section 834:15093 ("Log a Visit").
 *
 * Flow: the rating starts as a big centred row of beans. Shortly after the
 * user lifts their finger it collapses into a compact "Rating" row with the
 * favourite heart, and the four optional sections appear below.
 */

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
  /** When true, the cafe card is read-only (edit mode). */
  cafeLocked?: boolean;
  /** Opens the cafe picker (create mode). Ignored when cafeLocked. */
  onPressCafe?: () => void;
  initialValues?: Partial<ReviewFormValues>;
  cancelLabel?: string;
  submitLabel?: string;
  submittingLabel?: string;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: ReviewFormValues) => void;
}

const ORDER_ITEMS = [
  'Flat White',
  'Cappuccino',
  'Latte',
  'Americano',
  'Espresso',
  'Mocha',
  'Macchiato',
  'Matcha',
  'Hot Chocolate',
];

const MAX_LIKES = 3;
const MAX_PHOTOS = 5;
/** How long the big rating lingers after the finger lifts before collapsing. */
const RATING_COLLAPSE_DELAY_MS = 600;
/** The "(Optional)" / hint grey in the frames. */
const HINT_GREY = '#707070';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function ordinal(day: number): string {
  if (day % 100 >= 11 && day % 100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/** "Friday 3rd October, 2025" */
function formatVisitDate(date: Date): string {
  return `${WEEKDAYS[date.getDay()]} ${ordinal(date.getDate())} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`;
}

function formatRating(rating: number): string {
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
}

const enterFade = FadeIn.duration(250);
const enterSection = FadeInUp.springify().duration(250);
const layoutSpring = Layout.springify().duration(250);

function Chevron({ open }: { open: boolean }) {
  return (
    <View style={open ? styles.chevronOpen : undefined}>
      <SvgXml xml={CHEVRON_DOWN_16_SVG} width={16} height={16} />
    </View>
  );
}

function Section({
  title,
  done,
  open,
  onToggle,
  children,
}: {
  title: string;
  done: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Animated.View entering={enterSection} layout={layoutSpring} style={styles.section}>
      <TouchableOpacity
        style={[styles.sectionHeader, !open && styles.sectionHeaderClosed]}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <Text style={styles.label}>{title}</Text>
        <Text style={styles.optional}>(Optional)</Text>
        <View style={styles.sectionIcons}>
          {done && (
            <View style={styles.checkCircle}>
              <SvgXml xml={CHECK_12_CREAM_SVG} width={12} height={12} />
            </View>
          )}
          <Chevron open={open} />
        </View>
      </TouchableOpacity>
      {open && <View style={[styles.sectionBody, styles.underlined]}>{children}</View>}
    </Animated.View>
  );
}

function CafeCard({
  cafe,
  locked,
  onPress,
}: {
  cafe: ReviewFormCafe | null;
  locked: boolean;
  onPress?: () => void;
}) {
  const { cafes } = useReviews();
  const { coords } = useLocation();
  const details = useMemo(
    () => (cafe ? cafes.find((c) => String(c.id) === String(cafe.id)) : undefined),
    [cafes, cafe]
  );
  const image = cafe?.image || details?.image;
  const city = details?.location ? extractLocation(details.location) : '';
  const distance = details ? distanceLabelFor(coords, details) : undefined;

  return (
    <TouchableOpacity
      style={styles.cafeCard}
      onPress={onPress}
      disabled={locked}
      activeOpacity={0.85}
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.cafeImage} contentFit="cover" />
      ) : (
        <View style={[styles.cafeImage, styles.cafeImagePlaceholder]} />
      )}
      <View style={styles.cafeBody}>
        <View style={styles.cafeText}>
          <Text style={cafe ? styles.cafeName : styles.cafePlaceholder} numberOfLines={1}>
            {cafe ? cafe.name : 'Search for a cafe'}
          </Text>
          {cafe && (city || distance) ? (
            <View style={styles.cafeMeta}>
              <SvgXml xml={MAP_PIN_12_SVG} width={12} height={12} />
              {city ? <Text style={styles.cafeMetaText}>{city}</Text> : null}
              {city && distance ? <Text style={styles.cafeMetaText}>•</Text> : null}
              {distance ? <Text style={styles.cafeMetaText}>{distance}</Text> : null}
            </View>
          ) : null}
        </View>
        {!locked && (
          <SvgXml xml={cafe ? PENCIL_SVG : SEARCH_16_SVG} width={16} height={16} />
        )}
      </View>
    </TouchableOpacity>
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
  submitting,
  onCancel,
  onSubmit,
}: ReviewFormProps) {
  const { toggleFavorite, isFavorited } = useReviews();

  const initialOrdered = initialValues?.orderedItem ?? '';
  const [rating, setRating] = useState(initialValues?.rating ?? 0);
  const [ratingMode, setRatingMode] = useState<'big' | 'compact'>(
    initialValues?.rating ? 'compact' : 'big'
  );
  const [orderedItem, setOrderedItem] = useState(initialOrdered);
  const [otherSelected, setOtherSelected] = useState(
    initialOrdered.trim().length > 0 && !ORDER_ITEMS.includes(initialOrdered)
  );
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>(
    initialValues?.attributes ?? []
  );
  const [photos, setPhotos] = useState<ReviewPhoto[]>(initialValues?.photos ?? []);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [date, setDate] = useState<Date>(initialValues?.date ?? new Date());
  const [likeCategories, setLikeCategories] = useState<CafeCategory[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeStep, setActiveStep] = useState<ReviewStep | null>(null);

  // The gesture callbacks fire onChange and onRelease in the same frame, so the
  // release handler reads the rating from a ref rather than stale state.
  const ratingRef = useRef(rating);
  const orderedRef = useRef(orderedItem);
  useEffect(() => {
    orderedRef.current = orderedItem;
  }, [orderedItem]);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCollapseTimer = () => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
  };

  useEffect(() => clearCollapseTimer, []);

  // KeyboardProvider is off app-wide (see app/_layout.tsx); switch it on while
  // this form is mounted so the scroll view can follow the keyboard.
  const { setEnabled: setKeyboardHandling } = useKeyboardController();
  useEffect(() => {
    setKeyboardHandling(true);
    return () => setKeyboardHandling(false);
  }, [setKeyboardHandling]);

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

  const favoriteCafeId = cafe?.id ? String(cafe.id) : null;
  const isLovedCafe = favoriteCafeId ? isFavorited(favoriteCafeId) : false;
  const canSubmit = Boolean(cafe && rating > 0 && !submitting);
  const sectionsRevealed = ratingMode === 'compact';

  const toggleStep = (step: ReviewStep) => {
    setShowDatePicker(false);
    setActiveStep((current) => (current === step ? null : step));
  };

  const handleRatingChange = (next: number) => {
    clearCollapseTimer();
    setShowDatePicker(false);
    ratingRef.current = next;
    setRating(next);
  };

  const handleRatingRelease = () => {
    if (ratingMode !== 'big' || ratingRef.current <= 0) return;
    clearCollapseTimer();
    collapseTimer.current = setTimeout(() => {
      collapseTimer.current = null;
      setRatingMode('compact');
      if (orderedRef.current.trim().length === 0) setActiveStep('order');
    }, RATING_COLLAPSE_DELAY_MS);
  };

  const selectOrderItem = (item: string) => {
    setOtherSelected(false);
    setOrderedItem((current) => (current === item ? '' : item));
  };

  const toggleOther = () => {
    if (otherSelected) {
      setOtherSelected(false);
      setOrderedItem('');
    } else {
      setOtherSelected(true);
      if (ORDER_ITEMS.includes(orderedItem)) setOrderedItem('');
    }
  };

  const toggleAttribute = (attributeId: string) => {
    setShowDatePicker(false);
    setSelectedAttributes((prev) => {
      if (prev.includes(attributeId)) {
        return prev.filter((id) => id !== attributeId);
      }
      if (prev.length >= MAX_LIKES) {
        return prev;
      }
      return [...prev, attributeId];
    });
  };

  const addPhotoAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    const picked = assets
      .filter((asset) => asset.base64)
      .map((asset) => ({ uri: asset.uri, base64: asset.base64 as string }));
    setPhotos((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
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
    setPhotoIndex((current) => Math.max(0, Math.min(current, photos.length - 2)));
  };

  const handleCarouselScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (carouselWidth <= 0) return;
    const index = Math.round(event.nativeEvent.contentOffset.x / carouselWidth);
    setPhotoIndex(Math.max(0, Math.min(index, photos.length - 1)));
  };

  const handleCarouselLayout = (event: LayoutChangeEvent) => {
    setCarouselWidth(event.nativeEvent.layout.width);
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
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        bottomOffset={24}
        onScrollBeginDrag={() => setShowDatePicker(false)}
      >
        <Text style={styles.title}>Where You Bean?</Text>

        <CafeCard
          cafe={cafe}
          locked={cafeLocked}
          onPress={() => {
            setShowDatePicker(false);
            onPressCafe?.();
          }}
        />

        <View style={styles.formControl}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            style={[styles.inputRow, styles.underlined]}
            onPress={() => setShowDatePicker(!showDatePicker)}
            activeOpacity={0.8}
          >
            <Text style={styles.inputText} numberOfLines={1}>
              {formatVisitDate(date)}
            </Text>
            <Chevron open={showDatePicker} />
          </TouchableOpacity>
          {showDatePicker && (
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
          )}
        </View>

        {ratingMode === 'big' ? (
          <Animated.View entering={enterFade} style={styles.bigRating}>
            <Text style={[styles.label, styles.centered]}>How Was Your Experience?</Text>
            <Text style={styles.ratingHint}>
              {rating > 0 ? `${formatRating(rating)}/5` : 'Tap a bean to rate'}
            </Text>
            <View style={styles.bigBeans}>
              <SwipeableBeanRating
                variant="share"
                rating={rating}
                onChange={handleRatingChange}
                onRelease={handleRatingRelease}
                spacing={24}
              />
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={enterFade} layout={layoutSpring} style={styles.formControl}>
            <Text style={styles.label}>Rating</Text>
            <View style={[styles.compactRatingRow, styles.underlined]}>
              <View style={styles.compactBeans}>
                <SwipeableBeanRating
                  variant="share"
                  rating={rating}
                  onChange={handleRatingChange}
                  spacing={8}
                />
              </View>
              <TouchableOpacity
                onPress={handleToggleFavorite}
                disabled={!favoriteCafeId}
                activeOpacity={0.8}
                hitSlop={8}
                style={!favoriteCafeId && styles.disabled}
                accessibilityRole="button"
                accessibilityLabel={isLovedCafe ? 'Remove from favourites' : 'Add to favourites'}
              >
                <SvgXml
                  xml={isLovedCafe ? HEART_40_FILLED_SVG : HEART_40_SVG}
                  width={40}
                  height={40}
                />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {sectionsRevealed && (
          <>
            <Section
              title="What Did You Order?"
              done={orderedItem.trim().length > 0}
              open={activeStep === 'order'}
              onToggle={() => toggleStep('order')}
            >
              <View style={styles.chips}>
                {ORDER_ITEMS.map((item) => (
                  <Tag
                    key={item}
                    label={item}
                    dense
                    variant={!otherSelected && orderedItem === item ? 'filled' : 'outlineDark'}
                    onPress={() => selectOrderItem(item)}
                  />
                ))}
                <Tag
                  label="Other"
                  dense
                  variant={otherSelected ? 'filled' : 'outlineDark'}
                  onPress={toggleOther}
                />
              </View>
              {otherSelected && (
                <TextInput
                  style={styles.otherInput}
                  placeholder="Tell us what you ordered!"
                  placeholderTextColor={HINT_GREY}
                  value={orderedItem}
                  onChangeText={setOrderedItem}
                  onFocus={() => setShowDatePicker(false)}
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  autoFocus={!orderedItem}
                />
              )}
            </Section>

            <Section
              title="What Did You Like?"
              done={selectedAttributes.length > 0}
              open={activeStep === 'likes'}
              onToggle={() => toggleStep('likes')}
            >
              <Text style={styles.counter}>
                {selectedAttributes.length}/{MAX_LIKES}
              </Text>
              <View style={styles.chips}>
                {likeCategories.map((category) => {
                  const isSelected = selectedAttributes.includes(category.id);
                  const isDisabled = !isSelected && selectedAttributes.length >= MAX_LIKES;
                  return (
                    <View key={category.id} style={isDisabled && styles.disabled}>
                      <Tag
                        label={category.label}
                        iconXml={category.icon_svg_xml}
                        dense
                        variant={isSelected ? 'filled' : 'outlineDark'}
                        onPress={isDisabled ? undefined : () => toggleAttribute(category.id)}
                      />
                    </View>
                  );
                })}
              </View>
            </Section>

            <Section
              title="Notes"
              done={notes.trim().length > 0}
              open={activeStep === 'notes'}
              onToggle={() => toggleStep('notes')}
            >
              <TextInput
                style={styles.textArea}
                placeholder="Tell us about the coffee!"
                placeholderTextColor={HINT_GREY}
                value={notes}
                onChangeText={setNotes}
                onFocus={() => setShowDatePicker(false)}
                multiline
                textAlignVertical="top"
              />
            </Section>

            <Section
              title="Upload Photo"
              done={photos.length > 0}
              open={activeStep === 'photos'}
              onToggle={() => toggleStep('photos')}
            >
              {photos.length === 0 ? (
                <TouchableOpacity style={styles.uploadBox} onPress={addPhoto} activeOpacity={0.8}>
                  <View style={styles.plusIcon}>
                    <SvgXml xml={PLUS_16_SVG} width={16} height={16} />
                  </View>
                  <Text style={styles.uploadText}>Tap To Upload Image</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <View style={styles.carousel} onLayout={handleCarouselLayout}>
                    <ScrollView
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      onMomentumScrollEnd={handleCarouselScroll}
                    >
                      {photos.map((photo, index) => (
                        <Image
                          key={`${photo.uri}-${index}`}
                          source={{ uri: photo.uri }}
                          style={[styles.carouselPhoto, { width: carouselWidth }]}
                          contentFit="cover"
                        />
                      ))}
                    </ScrollView>
                    <TouchableOpacity
                      style={styles.removePhoto}
                      onPress={() => removePhoto(photoIndex)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Remove photo"
                    >
                      <X size={16} color={colors.background} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.carouselFooter}>
                    <View style={styles.dots}>
                      {photos.length > 1 &&
                        photos.map((photo, index) => (
                          <View
                            key={`${photo.uri}-dot-${index}`}
                            style={[styles.dot, index === photoIndex && styles.dotActive]}
                          />
                        ))}
                    </View>
                    {photos.length < MAX_PHOTOS && (
                      <Tag label="+ Add Photo" dense variant="outlineDark" onPress={addPhoto} />
                    )}
                  </View>
                </>
              )}
            </Section>
          </>
        )}
      </KeyboardAwareScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.85}>
          <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmitPress}
          disabled={!canSubmit}
          activeOpacity={0.9}
        >
          <Text style={styles.submitButtonText}>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md * 2,
    gap: 24,
  },
  title: {
    ...type.h1,
    color: colors.ink,
  },
  label: {
    ...type.title1,
    color: colors.ink,
  },
  centered: {
    textAlign: 'center',
  },
  underlined: {
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
  },
  disabled: {
    opacity: 0.4,
  },

  // Cafe card
  cafeCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.separator,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  cafeImage: {
    width: 50,
    alignSelf: 'stretch',
    minHeight: 50,
  },
  cafeImagePlaceholder: {
    backgroundColor: colors.cream,
  },
  cafeBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  cafeText: {
    flex: 1,
    gap: spacing.xs,
  },
  cafeName: {
    ...type.title1,
    color: colors.ink,
  },
  cafePlaceholder: {
    ...type.body1,
    color: HINT_GREY,
  },
  cafeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cafeMetaText: {
    ...type.footnote1,
    color: colors.slate,
  },

  // Date / rating form controls
  formControl: {
    gap: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  inputText: {
    ...type.body1,
    color: colors.ink,
    flex: 1,
  },
  uploadText: {
    ...type.body1,
    color: colors.ink,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  datePickerWrap: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  datePickerWheel: {
    height: 180,
    width: '100%',
  },
  bigRating: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  ratingHint: {
    ...type.body1,
    color: HINT_GREY,
    textAlign: 'center',
  },
  bigBeans: {
    width: '100%',
    paddingVertical: spacing.sm,
  },
  compactRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 80,
  },
  compactBeans: {
    flex: 1,
    paddingVertical: spacing.sm,
  },

  // Sections
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionHeaderClosed: {
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
  },
  optional: {
    ...type.footnote1,
    color: HINT_GREY,
    flex: 1,
  },
  sectionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkCircle: {
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    padding: spacing.xs,
  },
  sectionBody: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  counter: {
    ...type.footnote1,
    color: HINT_GREY,
  },
  textArea: {
    ...type.body1,
    color: colors.ink,
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingTop: spacing.sm + spacing.xs,
    paddingBottom: spacing.sm + spacing.xs,
    marginTop: spacing.sm,
  },
  // Single line, so Return can close the keyboard.
  otherInput: {
    ...type.body1,
    color: colors.ink,
    height: 40,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: 0,
    marginTop: spacing.sm,
  },

  // Photos
  uploadBox: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.ink,
    borderRadius: radius.md,
  },
  plusIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carousel: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  carouselPhoto: {
    height: 240,
  },
  removePhoto: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(15, 19, 18, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 23,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  dotActive: {
    backgroundColor: colors.ink,
  },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  cancelButton: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...type.title1,
    color: colors.ink,
  },
  submitButton: {
    flex: 1,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    // Match the 1px border on Cancel so both buttons are the same height.
    borderWidth: 1,
    borderColor: colors.ink,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    ...type.title1,
    color: colors.background,
  },
});
