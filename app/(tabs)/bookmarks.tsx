import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bookmark, MapPin, Star, Wifi, Car } from 'lucide-react-native';
import { useReviews } from '../../context/ReviewContext';
import { useRouter } from 'expo-router';
import { Badge, BadgeText } from '@gluestack-ui/themed';
import { colors } from '@/constants/theme';

export default function BookmarksScreen() {
  const { bookmarkedCafes, toggleBookmark, isBookmarked, addCafe } = useReviews();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={bookmarkedCafes.length === 0 ? styles.scrollContentEmpty : styles.scrollContent}
      >
        {bookmarkedCafes.length === 0 ? (
          <View style={styles.emptyState}>
            <Bookmark size={64} color="#E5E5EA" />
            <Text style={styles.emptyTitle}>No saved cafes yet</Text>
            <Text style={styles.emptyText}>
              Bookmark your favorite cafes to find them here
            </Text>
          </View>
        ) : (
          bookmarkedCafes.map((cafe) => (
            <View key={cafe.id} style={styles.cafeCard}>
              <TouchableOpacity
                style={styles.cafeCardContent}
                onPress={() => {
                  addCafe(cafe);
                  router.push(`/cafe/${cafe.id}`);
                }}
              >
                <View style={styles.cafeImageContainer}>
                  <Image source={{ uri: cafe.image }} style={styles.cafeImage} />
                </View>
                <View style={styles.cafeContent}>
                  <View style={styles.cafeHeader}>
                    <Text style={styles.cafeName}>{cafe.name}</Text>
                    <TouchableOpacity
                      style={styles.bookmarkButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleBookmark(cafe.id);
                      }}
                    >
                      <Bookmark
                        size={20}
                        color={isBookmarked(cafe.id) ? '#D4AF37' : '#8E8E93'}
                        fill={isBookmarked(cafe.id) ? '#D4AF37' : 'transparent'}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.cafeLocation}>
                    <MapPin size={14} color="#8E8E93" />
                    <Text style={styles.locationText}>{cafe.location}</Text>
                  </View>
                  <View style={styles.cafeFooter}>
                    <View style={styles.cafeTagsWrapper}>
                      {cafe.amenities?.includes('Has WiFi') && (
                        <Badge style={styles.wifiTag}>
                          <Wifi size={12} color="#007AFF" style={styles.tagIcon} />
                          <BadgeText style={styles.wifiTagText}>WiFi</BadgeText>
                        </Badge>
                      )}
                      {(cafe.amenities?.includes('Top Rated') || cafe.rating >= 4.5) && (
                        <Badge style={styles.ratedTag}>
                          <Star size={12} color="#D4AF37" style={styles.tagIcon} />
                          <BadgeText style={styles.ratedTagText}>Top</BadgeText>
                        </Badge>
                      )}
                      {cafe.amenities?.includes('Parking') && (
                        <Badge style={styles.parkingTag}>
                          <Car size={12} color="#4CAF50" style={styles.tagIcon} />
                          <BadgeText style={styles.parkingTagText}>Parking</BadgeText>
                        </Badge>
                      )}
                    </View>
                    <View style={styles.ratingContainer}>
                      <Star size={16} color="#4CAF50" fill="#4CAF50" />
                      <Text style={styles.ratingText}>{cafe.rating.toFixed(1)}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  scrollContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },
  cafeCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#1C1C1E',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cafeImageContainer: {
    width: 100,
    height: 120,
  },
  cafeImage: {
    width: '100%',
    height: '100%',
  },
  cafeCardContent: {
    flexDirection: 'row',
  },
  cafeContent: {
    flex: 1,
    padding: 12,
    paddingLeft: 16,
  },
  cafeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cafeName: {
    fontSize: 16,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
    flex: 1,
  },
  bookmarkButton: {
    padding: 4,
  },
  cafeLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    marginLeft: 4,
  },
  cafeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cafeTagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  wifiTag: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  wifiTagText: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    color: '#007AFF',
  },
  ratedTag: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  ratedTagText: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    color: '#D4AF37',
  },
  parkingTag: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  parkingTagText: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    color: '#4CAF50',
  },
  tagIcon: {
    marginRight: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: '#4CAF50',
  },
});
