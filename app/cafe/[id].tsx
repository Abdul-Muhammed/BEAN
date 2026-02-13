import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Linking,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  MoreVertical, 
  Heart, 
  Bookmark, 
  MapPin, 
  Clock, 
  Phone, 
  ExternalLink,
  Star,
  Wifi,
  X
} from 'lucide-react-native';
import StarRating from '../../components/StarRating';
import ReviewCard from '../../components/ReviewCard';
import CafeDetailSkeleton from '../../components/CafeDetailSkeleton';
import PhotoGallery from '../../components/PhotoGallery';
import RatingDistribution from '../../components/RatingDistribution';
import { useReviews } from '../../context/ReviewContext';
import { enrichCafeWithDetails } from '../../services/googlePlaces';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CafeDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { cafes, toggleFavorite, isFavorited, toggleBookmark, isBookmarked, addCafe } = useReviews();
  const [isLoading, setIsLoading] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);

  // Find cafe in context - this will update reactively when context changes
  const cafe = cafes.find(c => c.id === id);

  useEffect(() => {
    // If cafe is found, stop loading quickly
    if (cafe) {
      setIsLoading(false);
      
      // Lazy load Place Details if cafe has place_id and hasn't been enriched yet
      if (cafe.place_id && (!cafe.phone || !cafe.hours || !cafe.photos || cafe.photos.length <= 1)) {
        setIsEnriching(true);
        enrichCafeWithDetails(cafe.place_id).then((enrichedData) => {
          if (enrichedData) {
            // Update cafe in context with enriched data
            const updatedCafe = {
              ...cafe,
              phone: enrichedData.phone || cafe.phone,
              hours: enrichedData.hours || cafe.hours,
              amenities: enrichedData.amenities || cafe.amenities,
              photos: enrichedData.photos || cafe.photos || [cafe.image],
              rating: enrichedData.rating || cafe.rating
            };
            addCafe(updatedCafe);
          }
          setIsEnriching(false);
        }).catch((error) => {
          console.error('Error enriching cafe details:', error);
          setIsEnriching(false);
        });
      }
      return;
    }
    
    // If not found, wait a bit (cafe might be getting added to context)
    // This handles the case where addCafe() was called but context hasn't updated yet
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [cafe, id, cafes.length]);

  // Show skeleton while loading or if cafe not found after timeout
  if (isLoading) {
    return <CafeDetailSkeleton />;
  }

  if (!cafe) {
    // Cafe not found - could show error or redirect
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEFEFE' }}>
        <Text style={{ fontSize: 16, fontFamily: 'Lato-Regular', color: '#8E8E93' }}>
          Cafe not found
        </Text>
        <TouchableOpacity 
          style={{ marginTop: 16, padding: 12, backgroundColor: '#1C1C1E', borderRadius: 8 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#FFFFFF', fontFamily: 'Lato-Bold' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const photoCount = cafe.photos?.length || 0;
  const displayImage = cafe.photos && cafe.photos.length > 0 ? cafe.photos[0] : cafe.image;
  const isFav = isFavorited(cafe.id);
  const isSaved = isBookmarked(cafe.id);
  const favoritesCount = cafe.favoritesCount || 0;
  const savedCount = cafe.savedCount || 0;
  const reviewsCount = cafe.reviews.length;

  const handlePhonePress = () => {
    if (cafe.phone) {
      Linking.openURL(`tel:${cafe.phone.replace(/\s/g, '')}`);
    }
  };

  const handleLocationPress = () => {
    const url = `https://maps.google.com/?q=${encodeURIComponent(cafe.location)}`;
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Section with Image */}
        <View style={styles.headerImageContainer}>
          <Image 
            source={{ uri: displayImage }} 
            style={styles.headerImage}
            defaultSource={{ uri: 'https://via.placeholder.com/400x300/E5E5EA/E5E5EA' }}
          />
          
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1C1C1E" />
          </TouchableOpacity>

          {/* More Options Button */}
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => {}}
          >
            <MoreVertical size={24} color="#1C1C1E" />
          </TouchableOpacity>

          {/* Photos Button */}
          {photoCount > 0 && (
            <TouchableOpacity
              style={styles.photosButton}
              onPress={() => setShowPhotoGallery(true)}
            >
              <Text style={styles.photosButtonText}>{photoCount} Photos</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Business Info Section */}
        <View style={styles.content}>
          {/* Name and Action Icons */}
          <View style={styles.nameRow}>
            <Text style={styles.name}>{cafe.name}</Text>
            <View style={styles.actionIcons}>
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={() => toggleFavorite(cafe.id)}
              >
                <Heart 
                  size={24} 
                  color={isFav ? "#FF3B30" : "#1C1C1E"} 
                  fill={isFav ? "#FF3B30" : "transparent"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={() => toggleBookmark(cafe.id)}
              >
                <Bookmark 
                  size={24} 
                  color={isSaved ? "#1C1C1E" : "#1C1C1E"} 
                  fill={isSaved ? "#1C1C1E" : "transparent"}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Location */}
          <TouchableOpacity style={styles.infoRow} onPress={handleLocationPress}>
            <MapPin size={16} color="#8E8E93" />
            <Text style={styles.infoText}>{cafe.location}</Text>
            <ExternalLink size={14} color="#8E8E93" style={styles.externalIcon} />
          </TouchableOpacity>

          {/* Hours */}
          {cafe.hours && (
            <View style={styles.infoRow}>
              <Clock size={16} color="#8E8E93" />
              <Text style={styles.infoText}>{cafe.hours.currentHours || 'Hours not available'}</Text>
            </View>
          )}

          {/* Phone */}
          {cafe.phone && (
            <TouchableOpacity style={styles.infoRow} onPress={handlePhonePress}>
              <Phone size={16} color="#8E8E93" />
              <Text style={styles.infoText}>{cafe.phone}</Text>
            </TouchableOpacity>
          )}

          {/* Amenities Badges */}
          {cafe.amenities && cafe.amenities.length > 0 && (
            <View style={styles.amenitiesRow}>
              {cafe.amenities.map((amenity, index) => (
                <View key={index} style={styles.amenityBadge}>
                  {amenity === 'Has WiFi' && <Wifi size={14} color="#007AFF" />}
                  {amenity === 'Top Rated' && <Star size={14} color="#D4AF37" fill="#D4AF37" />}
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Ratings Section */}
          <View style={styles.ratingsSection}>
            <View style={styles.ratingsHeader}>
              <Text style={styles.sectionTitle}>Ratings</Text>
              <Text style={styles.overallRating}>★ {cafe.rating.toFixed(1)}</Text>
            </View>

            {/* Rating Distribution */}
            <RatingDistribution reviews={cafe.reviews} averageRating={cafe.rating} />

            {/* Stat Cards */}
            <View style={styles.statCards}>
              <View style={styles.statCard}>
                <Star size={16} color="#4CAF50" fill="#4CAF50" />
                <Text style={styles.statLabel}>Reviews</Text>
                <Text style={styles.statValue}>{reviewsCount}</Text>
              </View>
              <View style={styles.statCard}>
                <Heart size={16} color="#FF3B30" fill="#FF3B30" />
                <Text style={styles.statLabel}>Favourites</Text>
                <Text style={styles.statValue}>{favoritesCount}</Text>
              </View>
              <View style={styles.statCard}>
                <Bookmark size={16} color="#1C1C1E" fill="#1C1C1E" />
                <Text style={styles.statLabel}>Saved</Text>
                <Text style={styles.statValue}>{savedCount}</Text>
              </View>
            </View>
          </View>

          {/* Amenities Section */}
          {cafe.amenities && cafe.amenities.length > 0 && (
            <View style={styles.amenitiesSection}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.amenitiesScroll}
              >
                {cafe.amenities.map((amenity, index) => (
                  <View key={index} style={styles.amenityItem}>
                    {amenity === 'Has WiFi' && <Wifi size={20} color="#007AFF" />}
                    {amenity === 'Parking' && <Text style={styles.amenityEmoji}>🅿️</Text>}
                    {amenity === 'Top Rated' && <Star size={20} color="#D4AF37" fill="#D4AF37" />}
                    <Text style={styles.amenityItemText}>{amenity}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Reviews Section */}
          {cafe.reviews.length > 0 && (
            <View style={styles.reviewsSection}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              {cafe.reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.bottomButton, styles.saveButton, isSaved && styles.saveButtonActive]}
          onPress={() => toggleBookmark(cafe.id)}
        >
          <Bookmark 
            size={20} 
            color={isSaved ? "#FFFFFF" : "#1C1C1E"} 
            fill={isSaved ? "#FFFFFF" : "transparent"}
          />
          <Text style={[styles.bottomButtonText, isSaved && styles.bottomButtonTextActive]}>
            {isSaved ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => router.push({
            pathname: '/(tabs)/add-review',
            params: { cafeId: cafe.id, cafeName: cafe.name, cafeImage: cafe.image }
          })}
        >
          <Text style={styles.addReviewButtonText}>Add Review</Text>
        </TouchableOpacity>
      </View>

      {/* Photo Gallery Modal */}
      {cafe.photos && cafe.photos.length > 0 && (
        <PhotoGallery
          photos={cafe.photos}
          visible={showPhotoGallery}
          onClose={() => setShowPhotoGallery(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFEFE',
  },
  scrollView: {
    flex: 1,
  },
  headerImageContainer: {
    position: 'relative',
    width: '100%',
    height: SCREEN_WIDTH * 0.75, // ~40% of screen height
    backgroundColor: '#E5E5EA',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  moreButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photosButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  photosButtonText: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  name: {
    flex: 1,
    fontSize: 28,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
    marginRight: 12,
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionIcon: {
    padding: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
  },
  externalIcon: {
    marginLeft: 4,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 24,
  },
  amenityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  amenityText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
  },
  ratingsSection: {
    marginBottom: 32,
  },
  ratingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
  },
  overallRating: {
    fontSize: 18,
    fontFamily: 'Lato-Bold',
    color: '#4CAF50',
  },
  statCards: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
  amenitiesSection: {
    marginBottom: 32,
  },
  amenitiesScroll: {
    marginTop: 12,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    gap: 8,
  },
  amenityEmoji: {
    fontSize: 20,
  },
  amenityItemText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
  },
  reviewsSection: {
    marginBottom: 32,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FEFEFE',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  bottomButton: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    flexDirection: 'row',
    gap: 8,
  },
  saveButtonActive: {
    backgroundColor: '#1C1C1E',
    borderColor: '#1C1C1E',
  },
  bottomButtonText: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
  bottomButtonTextActive: {
    color: '#FFFFFF',
  },
  addReviewButtonText: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#FFFFFF',
  },
});
