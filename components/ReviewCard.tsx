import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Review } from '../data/mockData';
import StarRating from './StarRating';
import { colors } from '@/constants/theme';

interface ReviewCardProps {
  review: Review;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: review.userImage }} style={styles.userImage} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{review.userName}</Text>
          <StarRating rating={review.rating} size={16} />
        </View>
        <Text style={styles.date}>{review.date}</Text>
      </View>
      <Text style={styles.reviewText}>{review.text}</Text>
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
  reviewText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#4B5563',
    lineHeight: 20,
  },
});