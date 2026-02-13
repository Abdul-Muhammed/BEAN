import React, { useState, useEffect } from 'react';
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
import {
  X,
  Star,
  Camera,
  ChevronDown,
  Search,
} from 'lucide-react-native';
import { useReviews } from '../../context/ReviewContext';
import { searchCafesByText, convertPlaceToCafe } from '../../services/googlePlaces';
import * as ImagePicker from 'expo-image-picker';

const ATTRIBUTES = [
  { id: 'wifi', label: 'WiFi' },
  { id: 'ambient', label: 'Ambient' },
  { id: 'ethical', label: 'Ethical' },
  { id: 'cozy', label: 'Cozy' },
  { id: 'spacious', label: 'Spacious' },
  { id: 'quiet', label: 'Quiet' },
  { id: 'outdoor', label: 'Outdoor Seating' },
  { id: 'parking', label: 'Parking' },
];

export default function AddReviewScreen() {
  const { addReview } = useReviews();
  const params = useLocalSearchParams();
  const [selectedCafe, setSelectedCafe] = useState<any>(null);
  const [showCafeSearch, setShowCafeSearch] = useState(false);
  const [cafeSearchQuery, setCafeSearchQuery] = useState('');
  const [cafeSearchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  const handleCafeSearch = async () => {
    if (!cafeSearchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchCafesByText(cafeSearchQuery);
      const convertedCafes = await Promise.all(
        results.slice(0, 10).map(place => convertPlaceToCafe(place))
      );
      setSearchResults(convertedCafes);
    } catch (error) {
      Alert.alert('Search Error', 'Failed to search for cafes. Please try again.');
    }
    setIsSearching(false);
  };

  const selectCafe = (cafe: any) => {
    setSelectedCafe(cafe);
    setShowCafeSearch(false);
    setCafeSearchQuery('');
    setSearchResults([]);
  };

  const toggleAttribute = (attributeId: string) => {
    setSelectedAttributes(prev =>
      prev.includes(attributeId)
        ? prev.filter(id => id !== attributeId)
        : [...prev, attributeId]
    );
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newPhotos = result.assets.map(asset => asset.uri);
      setPhotos(prev => [...prev, ...newPhotos].slice(0, 5));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!selectedCafe) {
      Alert.alert('Missing Information', 'Please select a cafe');
      return;
    }
    if (rating === 0) {
      Alert.alert('Missing Information', 'Please add a rating');
      return;
    }

    addReview(selectedCafe.id, rating, notes, selectedAttributes, photos);
    Alert.alert('Success', 'Your review has been added!');

    setSelectedCafe(null);
    setRating(0);
    setNotes('');
    setSelectedAttributes([]);
    setPhotos([]);

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
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.field}>
          <Text style={styles.label}>Cafe visited *</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => router.push('/search-cafes')}
          >
            <Text style={selectedCafe ? styles.dropdownText : styles.dropdownPlaceholder}>
              {selectedCafe ? selectedCafe.name : 'Search for a cafe'}
            </Text>
            <ChevronDown size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            style={styles.dateDisplay}
            onPress={() => setShowDatePicker(!showDatePicker)}
          >
            <Text style={styles.dateText}>
              {date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
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

        <View style={styles.field}>
          <Text style={styles.label}>Rating *</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Star
                  size={40}
                  color={star <= rating ? '#4CAF50' : '#E5E5EA'}
                  fill={star <= rating ? '#4CAF50' : 'transparent'}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>What did you like?</Text>
          <View style={styles.attributesContainer}>
            {ATTRIBUTES.map((attr) => (
              <TouchableOpacity
                key={attr.id}
                style={[
                  styles.attributeButton,
                  selectedAttributes.includes(attr.id) && styles.attributeButtonActive
                ]}
                onPress={() => toggleAttribute(attr.id)}
              >
                <Text
                  style={[
                    styles.attributeText,
                    selectedAttributes.includes(attr.id) && styles.attributeTextActive
                  ]}
                >
                  {attr.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Share your experience..."
            placeholderTextColor="#8E8E93"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Photos (optional)</Text>
          <View style={styles.photosContainer}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoWrapper}>
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
                <Camera size={24} color="#8E8E93" />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit Review</Text>
        </TouchableOpacity>
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
    borderBottomColor: '#F0F0F0',
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
    paddingBottom: 100,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
    flex: 1,
  },
  dropdownPlaceholder: {
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    flex: 1,
  },
  searchContainer: {
    marginBottom: 24,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
    paddingVertical: 16,
  },
  searchResults: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchResultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchResultName: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  searchResultAddress: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
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
    borderRadius: 12,
    marginTop: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dateInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
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
    backgroundColor: '#4CAF50',
    borderRadius: 8,
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
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  attributesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attributeButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  attributeButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  attributeText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#666',
  },
  attributeTextActive: {
    color: '#4CAF50',
    fontFamily: 'Lato-Bold',
  },
  notesInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
    minHeight: 120,
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
    width: 80,
    height: 80,
    borderRadius: 12,
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
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    fontSize: 10,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#FFFFFF',
  },
});
