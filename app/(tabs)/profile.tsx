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
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useReviews } from '../../context/ReviewContext';
import { useFollows } from '../../context/FollowContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import ProfileTabs, { ProfileTab } from '../../components/ProfileTabs';
import BeanLogo from '../../components/BeanLogo';
import TopAppBar from '../../components/ui/TopAppBar';
import ProfileHero from '../../components/profile/ProfileHero';
import FriendDiscoveryCard from '../../components/profile/FriendDiscoveryCard';
import TopCafesSection from '../../components/profile/TopCafesSection';
import PreferencesSection from '../../components/profile/PreferencesSection';
import RatingsSection from '../../components/profile/RatingsSection';
import RecentActivitySection from '../../components/profile/RecentActivitySection';
import DiaryList from '../../components/profile/DiaryList';
import { MORE_HORIZONTAL_SVG, SETTINGS_SVG } from '@/constants/figmaIcons';
import { colors, spacing, type } from '@/constants/theme';

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
  const { followersCount, followingCount } = useFollows();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  const averageRating = useMemo(() => {
    if (userReviews.length === 0) return 0;
    const sum = userReviews.reduce((acc, review) => acc + review.rating, 0);
    return Math.round((sum / userReviews.length) * 10) / 10;
  }, [userReviews]);

  // Recent activity = the most recent reviews; userReviews is already newest-first.
  const recentActivity = useMemo(() => userReviews.slice(0, 4), [userReviews]);

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

  // Top header shows the first name (not the handle), falling back to "Profile".
  const headerName =
    (profile?.first_name || meta.first_name || '').toString().trim() || 'Profile';

  const profileImageUrl = profile?.profile_image_url || meta.avatar_url || meta.picture;
  const userName =
    fullNameFromProfile || meta.full_name || meta.name || profile?.first_name || 'User';

  const preferenceIds: string[] = Array.isArray(profile?.preferences)
    ? (profile!.preferences as string[])
    : [];

  const topCafeIds: string[] = Array.isArray(profile?.top_cafes)
    ? (profile!.top_cafes as string[])
    : [];

  const handleShareProfile = async () => {
    try {
      await Share.share({ message: `Check out ${username} on Bean` });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  };

  const goToDiaryEntry = (id: string) =>
    router.push({ pathname: '/diary/[id]', params: { id } });

  const renderOverview = () => (
    <>
      <View style={styles.sectionGroup}>
        <View style={styles.section}>
          <TopCafesSection
            reviews={userReviews}
            topCafeIds={topCafeIds}
            isFavorited={isFavorited}
            onPressCafe={(cafeId) =>
              router.push({ pathname: '/cafe/[id]', params: { id: cafeId } })
            }
            onPressEdit={() => router.push('/edit-top-cafes')}
          />
        </View>

        <View style={styles.section}>
          <PreferencesSection
            preferenceIds={preferenceIds}
            onPressEdit={() => router.push('/(onboarding)/preferences')}
          />
        </View>

        <View style={styles.sectionLast}>
          <RatingsSection
            ratings={userReviews.map((r) => r.rating)}
            averageRating={averageRating}
            reviewsCount={userReviews.length}
            favouritesCount={favoritedCafeIds.length}
            savedCount={bookmarkedCafes.length}
            onPressReviews={() => setActiveTab('diary')}
            onPressFavourites={() => router.push('/list/favorites')}
            onPressSaved={() => router.push('/list/bookmarks')}
          />
        </View>
      </View>

      <RecentActivitySection
        reviews={recentActivity}
        isFavorited={isFavorited}
        onPressEntry={goToDiaryEntry}
        onPressViewAll={() => setActiveTab('diary')}
      />
    </>
  );

  const renderDiary = () => {
    if (userReviews.length === 0) {
      return (
        <View style={styles.diaryEmpty}>
          <BeanLogo width={70} height={118} />
          <Text style={styles.diaryEmptyTitle}>Where you bean?</Text>
          <Text style={styles.diaryEmptySubtitle}>
            Your cafe diary is empty. Time to explore and log your first spot!
          </Text>
        </View>
      );
    }

    return (
      <DiaryList
        reviews={userReviews}
        isFavorited={isFavorited}
        onPressEntry={goToDiaryEntry}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <TopAppBar
        title={headerName}
        leadingXml={SETTINGS_SVG}
        onPressLeading={() => router.push('/settings')}
        leadingLabel="Settings"
        trailingXml={MORE_HORIZONTAL_SVG}
        onPressTrailing={handleShareProfile}
        trailingLabel="Share profile"
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[1]}
      >
        <View style={styles.heroBlock}>
          {isProfileLoading ? (
            <ActivityIndicator size="large" color={colors.ink} style={styles.loader} />
          ) : (
            <ProfileHero
              username={username}
              fullName={userName}
              bio={profile?.bio ?? null}
              joinedLabel={formatJoinDate(profile?.created_at)}
              profileImageUrl={profileImageUrl}
              followingCount={followingCount}
              followersCount={followersCount}
              onPressEdit={() => router.push('/settings/edit-profile')}
              onPressFollowing={() => router.push('/following')}
              onPressFollowers={() => router.push('/followers')}
            />
          )}
          <FriendDiscoveryCard onPress={() => router.push('/connect-friends')} />
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
    paddingBottom: 40,
  },
  loader: {
    marginVertical: 60,
  },
  heroBlock: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  sectionGroup: {
    paddingHorizontal: spacing.md,
  },
  section: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  sectionLast: {
    paddingVertical: spacing.md,
  },
  diaryEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
    paddingBottom: 80,
  },
  diaryEmptyTitle: {
    ...type.h1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.ink,
    textAlign: 'center',
  },
  diaryEmptySubtitle: {
    ...type.body1,
    lineHeight: 20,
    color: colors.greyNormal,
    textAlign: 'center',
  },
});
