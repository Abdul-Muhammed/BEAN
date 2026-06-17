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
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { LogOut, Plus, Bookmark, Heart, Coffee } from 'lucide-react-native';
import { useReviews } from '../../context/ReviewContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import ProfileTabs from '../../components/ProfileTabs';
import StatCard from '../../components/StatCard';
import RatingHistogram from '../../components/RatingHistogram';
import BeanRating from '../../components/BeanRating';
import BeanLogo from '../../components/BeanLogo';
import { UserReview } from '../../data/mockData';
import { colors } from '@/constants/theme';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

type ParsedVisitDate = {
  year: number;
  month: string;
  day: number;
  timestamp: number;
};

function buildParsedVisitDate(year: number, monthIndex: number, day: number): ParsedVisitDate | null {
  if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null;

  const date = new Date(year, monthIndex, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }

  return {
    year,
    month: MONTH_NAMES[monthIndex],
    day,
    timestamp: date.getTime(),
  };
}

function parseVisitDate(visitDate?: string): ParsedVisitDate | null {
  if (!visitDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(visitDate);
  if (!match) return null;
  const [, y, m, d] = match;
  const monthIndex = Number(m) - 1;
  return buildParsedVisitDate(Number(y), monthIndex, Number(d));
}

function parseDisplayDate(displayDate: string): ParsedVisitDate | null {
  const currentDate = new Date();
  if (displayDate === 'Just now') {
    return buildParsedVisitDate(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate()
    );
  }

  const dateMatch = displayDate.match(/^(\d+)\s+(\w+)(?:\s+(\d{4}))?$/);
  if (!dateMatch) return null;

  const [, day, month, year] = dateMatch;
  const monthIndex = MONTH_NAMES.indexOf(month);
  return buildParsedVisitDate(
    year ? Number(year) : currentDate.getFullYear(),
    monthIndex,
    Number(day)
  );
}

function getReviewVisitDate(review: UserReview): ParsedVisitDate | null {
  return parseVisitDate(review.visitDate) || parseDisplayDate(review.date);
}

export default function ProfileScreen() {
  const { userReviews, bookmarkedCafes, isFavorited } = useReviews();
  const { user, signOut } = useAuth();
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
            router.replace('/');
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
  
  // Auth user metadata (Google/Apple) acts as a fallback for the profile row.
  const meta = (user?.user_metadata ?? {}) as Record<string, any>;
  const metaFirstName = meta.first_name || meta.full_name || meta.name;
  const fullNameFromProfile = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  const username = hasValidUsername
    ? `@${profile.username.trim()}`
    : `@${(profile?.first_name || metaFirstName || 'user').toString().toLowerCase()}`;

  const profileImageUrl =
    profile?.profile_image_url || meta.avatar_url || meta.picture;
  const userName =
    fullNameFromProfile || meta.full_name || meta.name || profile?.first_name || 'User';

  // Group reviews by visit year for Diary tab. Prefer the user-picked
  // `visitDate` when present; fall back to the older parsed `date` string.
  const reviewsByYear = useMemo(() => {
    const grouped: { [key: string]: UserReview[] } = {};

    userReviews.forEach((review) => {
      const visitDate = getReviewVisitDate(review);
      const year = visitDate ? String(visitDate.year) : 'Other';

      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(review);
    });

    const sortValueOf = (review: UserReview): number => {
      return getReviewVisitDate(review)?.timestamp || 0;
    };

    return Object.keys(grouped)
      .sort((a, b) => {
        if (a === 'Other') return 1;
        if (b === 'Other') return -1;
        return Number(b) - Number(a);
      })
      .map((year) => ({
        year,
        reviews: grouped[year].sort((a, b) => sortValueOf(b) - sortValueOf(a)),
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
          icon={Plus}
          label="Visited"
          value={visitedCount}
          iconColor="#1C1C1E"
          onPress={() => setActiveTab('diary')}
        />
        <StatCard
          icon={Bookmark}
          label="Saved"
          value={savedCount}
          iconColor="#1C1C1E"
          onPress={() => router.push('/(tabs)/bookmarks')}
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
                onPress={() =>
                  router.push({
                    pathname: '/diary/[id]',
                    params: { id: review.id },
                  })
                }
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
                    <BeanRating rating={review.rating} size={12} />
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
        data={reviewsByYear}
        keyExtractor={(item) => item.year}
        contentContainerStyle={styles.diaryContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.yearSection}>
            <View style={styles.yearHeaderRow}>
              <Text style={styles.yearHeader}>{item.year}</Text>
              <View style={styles.yearHeaderLine} />
              <Text style={styles.yearCount}>
                {item.reviews.length} {item.reviews.length === 1 ? 'visit' : 'visits'}
              </Text>
            </View>
            {item.reviews.map((review) => {
              const isFav = isFavorited(review.cafeId);
              const visitDate = getReviewVisitDate(review);
              const dayNumber = visitDate
                ? String(visitDate.day)
                : review.date.match(/\d+/)?.[0] || review.date;
              const monthName = visitDate
                ? visitDate.month
                : review.date.match(/[A-Za-z]+/)?.[0] || '';
              const monthAbbr = MONTH_ABBR[monthName] || monthName.slice(0, 3).toUpperCase();
              return (
                <TouchableOpacity
                  key={review.id}
                  style={styles.diaryCard}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: '/diary/[id]',
                      params: { id: review.id },
                    })
                  }
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
                      <BeanRating rating={review.rating} size={14} />
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
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
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
  yearSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  yearHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  yearHeader: {
    fontSize: 18,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
  },
  yearHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  yearCount: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  diaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
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
