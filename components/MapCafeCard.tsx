import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { MapPin, Bookmark, Star, Wifi } from 'lucide-react-native';
import { Cafe } from '../data/mockData';
import { useReviews } from '../context/ReviewContext';

interface MapCafeCardProps {
  cafe: Cafe;
  distance?: string; // e.g., "2km"
}

export default function MapCafeCard({ cafe, distance = '2km' }: MapCafeCardProps) {
  const { toggleBookmark, isBookmarked } = useReviews();

  const handlePress = () => {
    router.push(`/cafe/${cafe.id}`);
  };

  const handleBookmarkPress = (e: any) => {
    e.stopPropagation();
    toggleBookmark(cafe.id);
  };

  // Extract location (suburb or city)
  const extractLocation = (address: string): string => {
    const parts = address.split(',');
    if (parts.length > 1) {
      const suburb = parts[parts.length - 2]?.trim();
      if (suburb && !suburb.includes('Auckland')) {
        return suburb;
      }
    }
    return 'Auckland';
  };

  const location = extractLocation(cafe.location);
  const amenities = cafe.amenities || [];
  const visibleAmenities = amenities.slice(0, 2);
  const remainingCount = Math.max(0, amenities.length - 2);
  const isBooked = isBookmarked(cafe.id);

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <Image source={{ uri: cafe.image }} style={styles.image} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{cafe.name}</Text>
          <TouchableOpacity
            style={styles.bookmarkButton}
            onPress={handleBookmarkPress}
          >
            <Bookmark
              size={20}
              color={isBooked ? '#D4AF37' : '#8E8E93'}
              fill={isBooked ? '#D4AF37' : 'transparent'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.locationRow}>
          <MapPin size={14} color="#8E8E93" />
          <Text style={styles.locationText}>{location} • {distance}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.amenitiesRow}>
            {visibleAmenities.map((amenity, index) => (
              <View key={index} style={styles.amenityTag}>
                {amenity === 'Has WiFi' && <Wifi size={12} color="#007AFF" />}
                {amenity === 'Top Rated' && <Star size={12} color="#D4AF37" fill="#D4AF37" />}
                <Text style={styles.amenityText}>{amenity}</Text>
              </View>
            ))}
            {remainingCount > 0 && (
              <View style={styles.moreTag}>
                <Text style={styles.moreText}>+{remainingCount}</Text>
              </View>
            )}
          </View>

          <View style={styles.ratingRow}>
            <Star size={16} color="#4CAF50" fill="#4CAF50" />
            <Text style={styles.ratingText}>{cafe.rating.toFixed(1)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: 100,
    height: 100,
    backgroundColor: '#E5E5EA',
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
    marginRight: 8,
  },
  bookmarkButton: {
    padding: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  amenityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  amenityText: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
  },
  moreTag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  moreText: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
});

