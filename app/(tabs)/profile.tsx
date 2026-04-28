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
import { LogOut, Star, Plus, Bookmark, Heart, Coffee } from 'lucide-react-native';
import { useReviews } from '../../context/ReviewContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import ProfileTabs from '../../components/ProfileTabs';
import StatCard from '../../components/StatCard';
import RatingHistogram from '../../components/RatingHistogram';
import StarRating from '../../components/StarRating';
import BeanLogo from '../../components/BeanLogo';
import { UserReview } from '../../data/mockData';

const MONTH_ABBR: Record<string, string> = {
  January: 'JAN',
  February: 'FEB',
  March: 'MAR',
  April: 'APR',
  May: 'MAY',
  June: 'JUN',
  July: 'JUL',
  August: 'AUG',
  September: 'SEP',
  October: 'OCT',
  November: 'NOV',
  December: 'DEC',
};

export default function ProfileScreen() {
  const { userReviews, bookmarkedCafes, isFavorited, getCafeById, addCafe } = useReviews();
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

  // Recent activity = the most recent reviews; userReviews is already newest-first.
  const recentActivity = useMemo(() => userReviews.slice(0, 3), [userReviews]);

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
        <RatingHistogram
          ratings={userReviews.map((r) => r.rating)}
          averageRating={averageRating}
        />
      </View>

      {/* Recent Activity Section */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {recentActivity.length === 0 ? (
          <View style={styles.activityEmpty}>
            <Coffee size={32} color="#8E8E93" />
            <Text style={styles.activityEmptyTitle}>No reviews yet</Text>
            <Text style={styles.activityEmptySubtitle}>
              Your coffee opinions are still steeping. Go find a cafe and spill the beans.
            </Text>
          </View>
        ) : (
          <View style={styles.activityList}>
            {recentActivity.map((review) => (
              <TouchableOpacity
                key={review.id}
                style={styles.activityCard}
                activeOpacity={0.85}
                onPress={() => router.push(`/cafe/${review.cafeId}`)}
              >
                {review.cafeImage ? (
                  <Image source={{ uri: review.cafeImage }} style={styles.activityThumb} />
                ) : (
                  <View style={[styles.activityThumb, styles.activityThumbFallback]}>
                    <BeanLogo width={18} height={30} color="#FFFFFF" />
                  </View>
                )}
                <View style={styles.activityBody}>
                  <View style={styles.activityTitleRow}>
                    <Text style={styles.activityCafeName} numberOfLines={1}>
                      {review.cafeName}
                    </Text>
                    <Text style={styles.activityDate}>{review.date}</Text>
                  </View>
                  <View style={styles.activityRatingRow}>
                    <StarRating rating={review.rating} size={12} />
                    <Text style={styles.activityRatingText}>
                      {review.rating.toFixed(1)}
                    </Text>
                  </View>
                  {review.text ? (
                    <Text style={styles.activityText} numberOfLines={2}>
                      {review.text}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

    </ScrollView>
  );

  const renderDiaryEmpty = () => (
    <View style={styles.diaryEmptyContainer}>
      <BeanLogo width={70} height={118} />
      <Text style={styles.diaryEmptyTitle}>Where you bean?</Text>
      <Text style={styles.diaryEmptySubtitle}>
        Your cafe diary is empty. Time to explore and log your first spot!
      </Text>
    </View>
  );

  const renderDiaryTab = () => {
    if (userReviews.length === 0) {
      return renderDiaryEmpty();
    }

    return (
      <FlatList
        data={reviewsByMonth}
        keyExtractor={(item) => item.month}
        contentContainerStyle={styles.diaryContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.monthSection}>
            <View style={styles.monthHeaderRow}>
              <Text style={styles.monthHeader}>{item.month}</Text>
              <View style={styles.monthHeaderLine} />
              <Text style={styles.monthCount}>
                {item.reviews.length} {item.reviews.length === 1 ? 'visit' : 'visits'}
              </Text>
            </View>
            {item.reviews.map((review) => {
              const isFav = isFavorited(review.cafeId);
              const dayNumber = review.date.match(/\d+/)?.[0] || review.date;
              const monthName = review.date.match(/[A-Za-z]+/)?.[0] || '';
              const monthAbbr = MONTH_ABBR[monthName] || monthName.slice(0, 3).toUpperCase();
              return (
                <TouchableOpacity
                  key={review.id}
                  style={styles.diaryCard}
                  activeOpacity={0.85}
                    onPress={() => {
                      const cafe = getCafeById(review.cafeId);
                      if (cafe) {
                        addCafe(cafe);
                      }
                      router.push(`/cafe/${review.cafeId}`);
                    }}
                >
                  <View style={styles.diaryDateBlock}>
                    <Text style={styles.diaryDateDay}>{dayNumber}</Text>
                    <Text style={styles.diaryDateMonth}>{monthAbbr}</Text>
                  </View>

                  {review.cafeImage ? (
                    <Image source={{ uri: review.cafeImage }} style={styles.diaryThumb} />
                  ) : (
                    <View style={[styles.diaryThumb, styles.diaryThumbFallback]}>
                      <BeanLogo width={20} height={34} color="#FFFFFF" />
                    </View>
                  )}

                  <View style={styles.diaryCardBody}>
                    <View style={styles.diaryCardTitleRow}>
                      <Text style={styles.diaryCardName} numberOfLines={1}>
                        {review.cafeName}
                      </Text>
                      {isFav && (
                        <Heart size={14} color="#FF3B30" fill="#FF3B30" />
                      )}
                    </View>
                    <View style={styles.diaryCardRatingRow}>
                      <StarRating rating={review.rating} size={14} />
                      <Text style={styles.diaryCardRatingText}>
                        {review.rating.toFixed(1)}
                      </Text>
                    </View>
                    {review.orderedItem && (
                      <Text style={styles.diaryCardOrderText} numberOfLines={1}>
                        Ordered: {review.orderedItem}
                      </Text>
                    )}
                    {review.text && (
                      <Text style={styles.diaryCardNotesText} numberOfLines={2}>
                        {review.text}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      />
    );
  };

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
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
  },
  activitySection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  activityList: {
    marginTop: 16,
    gap: 10,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  activityThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    marginRight: 12,
  },
  activityThumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
  },
  activityBody: {
    flex: 1,
  },
  activityTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  activityCafeName: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
  activityDate: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
  activityRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  activityRatingText: {
    fontSize: 12,
    fontFamily: 'Lato-Bold',
    color: '#4CAF50',
  },
  activityText: {
    fontSize: 13,
    fontFamily: 'Lato-Regular',
    color: '#3A3A3C',
    lineHeight: 18,
  },
  activityEmpty: {
    marginTop: 16,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    alignItems: 'center',
  },
  activityEmptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
  activityEmptySubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
  diaryContent: {
    paddingTop: 12,
    paddingBottom: 100,
  },
  monthSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  monthHeader: {
    fontSize: 18,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
  },
  monthHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  monthCount: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  diaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  diaryDateBlock: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    paddingTop: 4,
  },
  diaryDateDay: {
    fontSize: 22,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
    lineHeight: 26,
  },
  diaryDateMonth: {
    fontSize: 11,
    fontFamily: 'Lato-Bold',
    color: '#D4AF37',
    letterSpacing: 1,
    marginTop: 2,
  },
  diaryThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    marginRight: 12,
  },
  diaryThumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
  },
  diaryCardBody: {
    flex: 1,
  },
  diaryCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  diaryCardName: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
  diaryCardRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  diaryCardRatingText: {
    fontSize: 13,
    fontFamily: 'Lato-Bold',
    color: '#4CAF50',
  },
  diaryCardOrderText: {
    fontSize: 13,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
    marginBottom: 3,
  },
  diaryCardNotesText: {
    fontSize: 13,
    fontFamily: 'Lato-Regular',
    color: '#6B6257',
    lineHeight: 18,
  },
  diaryEmptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  diaryEmptyTitle: {
    fontSize: 22,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  diaryEmptySubtitle: {
    fontSize: 15,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
});
