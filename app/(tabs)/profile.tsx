import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { LogOut, Star, Plus, Bookmark, Heart } from 'lucide-react-native';
import { useReviews } from '../../context/ReviewContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import ProfileTabs from '../../components/ProfileTabs';
import StatCard from '../../components/StatCard';
import HorizontalRatingDistribution from '../../components/HorizontalRatingDistribution';
import ActivityCard from '../../components/ActivityCard';
import StarRating from '../../components/StarRating';
import { UserReview } from '../../data/mockData';

export default function ProfileScreen() {
  const { userReviews, bookmarkedCafes, isFavorited } = useReviews();
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const { profile, isLoading: isProfileLoading } = useUserProfile();
  const [activeTab, setActiveTab] = useState<'profile' | 'diary'>('profile');

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/sign-in');
          },
        },
      ]
    );
  };

  // Calculate stats
  const averageRating = useMemo(() => {
    if (userReviews.length === 0) return 0;
    const sum = userReviews.reduce((acc, review) => acc + review.rating, 0);
    return Math.round((sum / userReviews.length) * 10) / 10;
  }, [userReviews]);

  const visitedCount = userReviews.length;
  const savedCount = bookmarkedCafes.length;

  // Prioritize username if it exists, is not empty, and is not a temporary placeholder
  const hasValidUsername = profile?.username && 
    profile.username.trim().length > 0 && 
    !profile.username.trim().startsWith('temp_');
  
  const username = hasValidUsername
    ? `@${profile.username.trim()}`
    : `@${(user?.firstName || 'user').toLowerCase()}`;
  
  const profileImageUrl = profile?.profile_image_url || user?.imageUrl;
  const userName = user?.fullName || user?.firstName || 'User';

  // Group reviews by month for Diary tab
  const reviewsByMonth = useMemo(() => {
    const grouped: { [key: string]: UserReview[] } = {};
    
    userReviews.forEach(review => {
      // Parse date like "6 October" or "29 September"
      const dateMatch = review.date.match(/(\d+)\s+(\w+)/);
      if (dateMatch) {
        const month = dateMatch[2];
        if (!grouped[month]) {
          grouped[month] = [];
        }
        grouped[month].push(review);
      } else {
        // Fallback for dates that don't match pattern
        if (!grouped['Other']) {
          grouped['Other'] = [];
        }
        grouped['Other'].push(review);
      }
    });

    // Sort months (most recent first) and sort reviews within each month
    const monthOrder = ['October', 'September', 'August', 'July', 'June', 'May', 'April', 'March', 'February', 'January', 'Other'];
    const sortedMonths = Object.keys(grouped).sort((a, b) => {
      const aIndex = monthOrder.indexOf(a);
      const bIndex = monthOrder.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return sortedMonths.map(month => ({
      month,
      reviews: grouped[month].sort((a, b) => {
        // Sort by date number (extract number from date string)
        const aNum = parseInt(a.date.match(/\d+/)?.[0] || '0');
        const bNum = parseInt(b.date.match(/\d+/)?.[0] || '0');
        return bNum - aNum; // Descending (newest first)
      })
    }));
  }, [userReviews]);

  const renderProfileTab = () => (
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Profile Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color="#FF3B30" />
        </TouchableOpacity>

        {isProfileLoading ? (
          <ActivityIndicator size="large" color="#1C1C1E" style={styles.loader} />
        ) : (
          <>
            {profileImageUrl ? (
              <Image
                source={{ uri: profileImageUrl }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileImagePlaceholderText}>
                  {userName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.username}>{username}</Text>
          </>
        )}
      </View>

      {/* Stat Cards */}
      <View style={styles.statCardsContainer}>
        <StatCard
          icon={Star}
          label="Average Rating"
          value={averageRating.toFixed(1)}
          iconColor="#4CAF50"
        />
        <StatCard
          icon={Plus}
          label="Visited"
          value={visitedCount}
          iconColor="#1C1C1E"
        />
        <StatCard
          icon={Bookmark}
          label="Saved"
          value={savedCount}
          iconColor="#1C1C1E"
        />
      </View>

      {/* Ratings Section */}
      <View style={styles.ratingsSection}>
        <View style={styles.ratingsHeader}>
          <Text style={styles.sectionTitle}>Ratings</Text>
          <View style={styles.overallRating}>
            <Star size={18} color="#4CAF50" fill="#4CAF50" />
            <Text style={styles.overallRatingText}>{averageRating.toFixed(1)}</Text>
          </View>
        </View>
        <HorizontalRatingDistribution reviews={userReviews} />
      </View>

      {/* Recent Activity Section */}
      <View style={styles.recentActivitySection}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {userReviews.slice(0, 3).map((review) => (
          <ActivityCard
            key={review.id}
            review={review}
            userName={userName}
            userImage={user?.imageUrl}
            onPress={() => router.push(`/cafe/${review.cafeId}`)}
          />
        ))}
      </View>
    </ScrollView>
  );

  const renderDiaryTab = () => (
    <FlatList
      data={reviewsByMonth}
      keyExtractor={(item) => item.month}
      contentContainerStyle={styles.diaryContent}
      renderItem={({ item }) => (
        <View style={styles.monthSection}>
          <Text style={styles.monthHeader}>{item.month}</Text>
          {item.reviews.map((review) => {
            const isFav = isFavorited(review.cafeId);
            // Extract just the day number from date (e.g., "6 October" -> "6")
            const dayNumber = review.date.match(/\d+/)?.[0] || review.date;
            return (
              <View key={review.id} style={styles.diaryEntry}>
                <View style={styles.diaryEntryLeft}>
                  <Text style={styles.diaryCafeName}>{dayNumber} {review.cafeName}</Text>
                </View>
                <View style={styles.diaryEntryRight}>
                  <StarRating rating={review.rating} size={16} />
                  {isFav && (
                    <Heart size={16} color="#FF3B30" fill="#FF3B30" style={styles.heartIcon} />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FEFEFE" />
      
      {/* Tab Navigation */}
      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === 'profile' ? renderProfileTab() : renderDiaryTab()}
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
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    position: 'relative',
  },
  signOutButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFF2F2',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImagePlaceholderText: {
    fontSize: 40,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#FFFFFF',
  },
  loader: {
    marginVertical: 40,
  },
  username: {
    fontSize: 18,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
  statCardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 32,
  },
  ratingsSection: {
    paddingHorizontal: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  overallRatingText: {
    fontSize: 18,
    fontFamily: 'Lato-Bold',
    color: '#4CAF50',
  },
  recentActivitySection: {
    paddingHorizontal: 20,
  },
  diaryContent: {
    paddingBottom: 100,
  },
  monthSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  monthHeader: {
    fontSize: 18,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  diaryEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  diaryEntryLeft: {
    flex: 1,
  },
  diaryCafeName: {
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
  },
  diaryEntryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heartIcon: {
    marginLeft: 4,
  },
});
