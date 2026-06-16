import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { MapPin, Star, Wifi, Car } from 'lucide-react-native';
import { CoffeeBean } from './BeanRating';
import { Cafe } from '../data/mockData';
import { useReviews } from '../context/ReviewContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { approximateDistanceMeters, formatDistance } from '../lib/geo';
import { colors, fonts } from '@/constants/theme';

interface ListCafeCardProps {
  cafe: Cafe;
}

// Extract a short suburb/city label from a full address string. Mirrors the
// logic used by MapCafeCard so the Lists screen reads consistently.
function extractLocation(address: string): string {
  if (!address) return '';
  const parts = address.split(',');
  if (parts.length > 1) {
    const suburb = parts[parts.length - 2]?.trim();
    if (suburb && !suburb.includes('Auckland')) {
      return suburb;
    }
  }
  return 'Auckland';
}

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  'Has WiFi': <Wifi size={12} color="#8E8E93" />,
  'Top Rated': <Star size={12} color={colors.gold} fill={colors.gold} />,
  Parking: <Car size={12} color="#8E8E93" />,
};

export default function ListCafeCard({ cafe }: ListCafeCardProps) {
  const { addCafe } = useReviews();
  const { profile } = useUserProfile();

  const handlePress = () => {
    addCafe(cafe);
    router.push(`/cafe/${cafe.id}`);
  };

  const city = extractLocation(cafe.location);

  // Distance is only shown when we have both the user's saved coordinates and
  // the cafe's coordinates; otherwise we gracefully fall back to city-only.
  let distanceLabel = '';
  if (
    typeof profile?.location_latitude === 'number' &&
    typeof profile?.location_longitude === 'number' &&
    typeof cafe.latitude === 'number' &&
    typeof cafe.longitude === 'number'
  ) {
    const meters = approximateDistanceMeters(
      profile.location_latitude,
      profile.location_longitude,
      cafe.latitude,
      cafe.longitude
    );
    distanceLabel = formatDistance(meters);
  }

  const amenities = cafe.amenities || [];
  const visibleAmenities = amenities.slice(0, 2);
  const remainingCount = Math.max(0, amenities.length - 2);

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.85}>
      <Image source={{ uri: cafe.image }} style={styles.image} resizeMode="cover" />

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {cafe.name}
        </Text>

        {!!city && (
          <View style={styles.locationRow}>
            <MapPin size={14} color={colors.mutedText} />
            <Text style={styles.locationText} numberOfLines={1}>
              {distanceLabel ? `${city} • ${distanceLabel}` : city}
            </Text>
          </View>
        )}

        {amenities.length > 0 && (
          <View style={styles.amenitiesRow}>
            {visibleAmenities.map((amenity, index) => (
              <View key={index} style={styles.chip}>
                {AMENITY_ICONS[amenity]}
                <Text style={styles.chipText}>{amenity}</Text>
              </View>
            ))}
            {remainingCount > 0 && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>+{remainingCount}</Text>
              </View>
            )}
          </View>
        )}

        {!!cafe.rating && (
          <View style={styles.ratingRow}>
            <CoffeeBean size={16} />
            <Text style={styles.ratingText}>{cafe.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    height: 120,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E3E3E3',
    marginBottom: 12,
    overflow: 'hidden',
  },
  image: {
    width: 120,
    height: 120,
    backgroundColor: colors.warmSurface,
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  name: {
    fontSize: 18,
    fontFamily: fonts.bodyBold,
    color: colors.primary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.mutedText,
    flexShrink: 1,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.warmBorder,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
  },
  ratingText: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.primary,
  },
});
