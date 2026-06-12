import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Review } from '../data/mockData';
import BeanRating from './BeanRating';
import { colors } from '@/constants/theme';

interface ReviewCardProps {
  review: Review;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {review.userImage ? (
          <Image source={{ uri: review.userImage }} style={styles.userImage} />
        ) : (
          <View style={[styles.userImage, styles.userImagePlaceholder]}>
            <Text style={styles.userImagePlaceholderText}>
              {(review.userName || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{review.userName}</Text>
          <BeanRating rating={review.rating} size={16} />
        </View>
        <Text style={styles.date}>{review.date}</Text>
      </View>
      {review.orderedItem ? (
        <Text style={styles.orderedItem}>
          <Text style={styles.orderedLabel}>Ordered: </Text>
          {review.orderedItem}
        </Text>
      ) : null}
      {review.text ? <Text style={styles.reviewText}>{review.text}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userImagePlaceholder: {
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userImagePlaceholderText: {
    fontSize: 18,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    color: '#9CA3AF',
  },
  orderedItem: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#4B5563',
    marginBottom: 6,
  },
  orderedLabel: {
    fontFamily: 'Lato-Bold',
    color: '#1F2937',
  },
  reviewText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#4B5563',
    lineHeight: 20,
  },
});