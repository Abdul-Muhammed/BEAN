import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import StarRating from './StarRating';
import { Cafe } from '../data/mockData';

interface CafeCardProps {
  cafe: Cafe;
}

// Extract suburb from full address
function extractSuburb(address: string): string {
  // Common patterns for Auckland addresses
  const patterns = [
    // "123 Street Name, Suburb, Auckland" -> "Suburb"
    /,\s*([^,]+),\s*Auckland/i,
    // "123 Street Name, Suburb" -> "Suburb"  
    /,\s*([^,]+)$/,
    // "Suburb, Auckland" -> "Suburb"
    /^([^,]+),\s*Auckland/i,
    // If no comma, try to get last part before "Auckland"
    /\s+([^,\s]+)\s+Auckland/i,
  ];
  
  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match && match[1]) {
      const suburb = match[1].trim();
      // Filter out common non-suburb words
      if (!['New Zealand', 'NZ', 'Central', 'CBD'].includes(suburb)) {
        return suburb;
      }
    }
  }
  
  // Fallback: return first part of address or full address if short
  const parts = address.split(',');
  return parts.length > 1 ? parts[1].trim() : address;
}
export default function CafeCard({ cafe }: CafeCardProps) {
  const handlePress = () => {
    router.push(`/cafe/${cafe.id}`);
  };

  const suburb = extractSuburb(cafe.location);
  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <Image source={{ uri: cafe.image }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.name}>{cafe.name}</Text>
        <View style={styles.locationContainer}>
          <MapPin size={14} color="#666" />
          <Text style={styles.location}>{suburb}</Text>
        </View>
        <View style={styles.ratingContainer}>
          <StarRating rating={cafe.rating} size={16} />
          <Text style={styles.ratingText}>{cafe.rating.toFixed(1)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 18,
    fontFamily: 'Lato-Bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  location: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#666',
  },
});