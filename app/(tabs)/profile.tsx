import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { useReviews } from '../../context/ReviewContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import ProfileTabs, { ProfileTab } from '../../components/ProfileTabs';
import BeanLogo from '../../components/BeanLogo';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileHero from '../../components/profile/ProfileHero';
import FriendDiscoveryCard from '../../components/profile/FriendDiscoveryCard';
import TopCafesSection from '../../components/profile/TopCafesSection';
import PreferencesSection from '../../components/profile/PreferencesSection';
import RatingsSection from '../../components/profile/RatingsSection';
import StatsCards from '../../components/profile/StatsCards';
import RecentActivitySection from '../../components/profile/RecentActivitySection';
import DiaryList from '../../components/profile/DiaryList';
import { colors } from '@/constants/theme';

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatJoinDate(createdAt?: string): string {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '';
  return `Joined ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ProfileScreen() {
  const { userReviews, bookmarkedCafes, favoritedCafeIds, isFavorited } = useReviews();
  const { user } = useAuth();
  const router = useRouter();
  const { profile, isLoading: isProfileLoading } = useUserProfile();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  // Calculate stats
  const averageRating = useMemo(() => {
    if (userReviews.length === 0) return 0;
    const sum = userReviews.reduce((acc, review) => acc + review.rating, 0);
    return Math.round((sum / userReviews.length) * 10) / 10;
  }, [userReviews]);

  // Recent activity = the most recent reviews; userReviews is already newest-first.
  const recentActivity = useMemo(() => userReviews.slice(0, 3), [userReviews]);

  // Prioritize username if it exists, is not empty, and is not a temporary placeholder
  const hasValidUsername =
    profile?.username &&
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
    ? `@${profile!.username.trim()}`
    : `@${(profile?.first_name || metaFirstName || 'user').toString().toLowerCase()}`;

  const profileImageUrl =
    profile?.profile_image_url || meta.avatar_url || meta.picture;
  const userName =
    fullNameFromProfile || meta.full_name || meta.name || profile?.first_name || 'User';

  const preferenceIds: string[] = Array.isArray(profile?.preferences)
    ? (profile!.preferences as string[])
    : [];

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Check out ${username} on Bean ☕`,
      });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  };

  const renderOverview = () => (
    <>
      <TopCafesSection
        reviews={userReviews}
        onPressCafe={(review) =>
          router.push({ pathname: '/cafe/[id]', params: { id: review.cafeId } })
        }
      />
      <PreferencesSection preferenceIds={preferenceIds} />
      <RatingsSection
        ratings={userReviews.map((r) => r.rating)}
        averageRating={averageRating}
      />
      <StatsCards
        reviewsCount={userReviews.length}
        favouritesCount={favoritedCafeIds.length}
        savedCount={bookmarkedCafes.length}
        onPressReviews={() => setActiveTab('diary')}
        onPressFavourites={() => router.push('/list/favorites')}
        onPressSaved={() => router.push('/list/bookmarks')}
      />
      <RecentActivitySection
        reviews={recentActivity}
        isFavorited={isFavorited}
        onPressEntry={(id) =>
          router.push({ pathname: '/diary/[id]', params: { id } })
        }
        onPressViewAll={() => setActiveTab('diary')}
      />
    </>
  );

  const renderDiary = () => {
    if (userReviews.length === 0) {
      return (
        <View style={styles.diaryEmptyContainer}>
          <BeanLogo width={70} height={118} />
          <Text style={styles.diaryEmptyTitle}>Where you bean?</Text>
          <Text style={styles.diaryEmptySubtitle}>
            Your cafe diary is empty. Time to explore and log your first spot!
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.diaryContent}>
        <DiaryList
          reviews={userReviews}
          isFavorited={isFavorited}
          onPressEntry={(id) =>
            router.push({ pathname: '/diary/[id]', params: { id } })
          }
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Sticky header */}
      <ProfileHeader
        username={username}
        onPressSettings={() => router.push('/settings')}
        onPressOverflow={handleShareProfile}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[2]}
      >
        {isProfileLoading ? (
          <ActivityIndicator size="large" color="#1C1C1E" style={styles.loader} />
        ) : (
          <ProfileHero
            username={username}
            fullName={userName}
            bio={profile?.bio ?? null}
            joinedLabel={formatJoinDate(profile?.created_at)}
            profileImageUrl={profileImageUrl}
            followingCount={0}
            followersCount={0}
            onPressEdit={() => router.push('/settings/edit-profile')}
          />
        )}

        <View style={styles.friendCardWrap}>
          <FriendDiscoveryCard />
        </View>

        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'overview' ? renderOverview() : renderDiary()}
      </ScrollView>
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
  loader: {
    marginVertical: 60,
  },
  friendCardWrap: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  diaryContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  diaryEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
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
