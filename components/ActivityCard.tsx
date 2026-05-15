import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Bookmark } from 'lucide-react-native';
import StarRating from './StarRating';
import { UserReview } from '../data/mockData';
import { colors } from '@/constants/theme';

interface ActivityCardProps {
  review: UserReview;
  userName?: string;
  userImage?: string;
  onPress?: () => void;
}

export default function ActivityCard({ review, userName, userImage, onPress }: ActivityCardProps) {
  // Show first 2 attributes, then "+X" for remaining
  const attributes = review.attributes || [];
  const visibleAttributes = attributes.slice(0, 2);
  const remainingCount = Math.max(0, attributes.length - 2);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Header with user info */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {userImage ? (
            <Image source={{ uri: userImage }} style={styles.userImage} />
          ) : (
            <View style={styles.userImagePlaceholder}>
              <Text style={styles.userImagePlaceholderText}>
                {userName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={styles.userTextContainer}>
            <Text style={styles.userText}>
              {userName || 'User'} {review.cafeName} • {review.date}
            </Text>
          </View>
        </View>
        <Bookmark size={20} color="#1C1C1E" />
      </View>

      {/* Tags */}
      {attributes.length > 0 && (
        <View style={styles.tagsContainer}>
          {visibleAttributes.map((attr, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{attr}</Text>
            </View>
          ))}
          {remainingCount > 0 && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>+{remainingCount}</Text>
            </View>
          )}
        </View>
      )}

      {/* Star Rating */}
      <View style={styles.ratingContainer}>
        <StarRating rating={review.rating} size={16} />
      </View>

      {/* Cafe Image */}
      {review.cafeImage && (
        <Image
          source={{ uri: review.cafeImage }}
          style={styles.cafeImage}
          resizeMode="cover"
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  userImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  userImagePlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  userImagePlaceholderText: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: '#FFFFFF',
  },
  userTextContainer: {
    flex: 1,
  },
  userText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
  },
  ratingContainer: {
    marginBottom: 12,
  },
  cafeImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#E5E5EA',
  },
});
