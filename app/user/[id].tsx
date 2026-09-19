import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ProfileTabs, { ProfileTab } from '../../components/ProfileTabs';
import TopAppBar from '../../components/ui/TopAppBar';
import ProfileHero from '../../components/profile/ProfileHero';
import FollowButton from '../../components/social/FollowButton';
import TopCafesSection from '../../components/profile/TopCafesSection';
import PreferencesSection from '../../components/profile/PreferencesSection';
import RatingsSection from '../../components/profile/RatingsSection';
import RecentActivitySection from '../../components/profile/RecentActivitySection';
import DiaryList from '../../components/profile/DiaryList';
import {
  getPublicProfile,
  getPublicCafeCounts,
  getUserReviews,
  getFollowCounts,
  doesUserFollowMe,
  type PublicCafeCounts,
} from '../../lib/follows';
import { UserReview } from '../../data/mockData';
import { ARROW_LEFT_SVG, MORE_HORIZONTAL_SVG } from '@/constants/figmaIcons';
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

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [cafeCounts, setCafeCounts] = useState<PublicCafeCounts>({
    favourites: 0,
    saved: 0,
  });
  const [theyFollowMe, setTheyFollowMe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    setLoading(true);
    setNotFound(false);

    Promise.all([
      getPublicProfile(id),
      getUserReviews(id),
      getFollowCounts(id),
      doesUserFollowMe(id),
      getPublicCafeCounts(id),
    ])
      .then(([prof, revs, cnts, follows, cafeCnts]) => {
        if (cancelled) return;
        if (!prof) {
          setNotFound(true);
          return;
        }
        setProfile(prof);
        setReviews(revs);
        setCounts(cnts);
        setTheyFollowMe(follows);
        setCafeCounts(cafeCnts);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('Failed to load user profile:', err);
          setNotFound(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews]);

  const recentActivity = useMemo(() => reviews.slice(0, 4), [reviews]);

  const username = profile?.username ? `@${profile.username}` : '@user';
  const fullName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() ||
    profile?.username ||
    'User';
  const preferenceIds: string[] = Array.isArray(profile?.preferences)
    ? (profile.preferences as string[])
    : [];
  const topCafeIds: string[] = Array.isArray(profile?.top_cafes)
    ? (profile.top_cafes as string[])
    : [];

  // Other people's reviews open as reviews, not as the cafe. Favourites are
  // private, so nothing here can be shown as favourited.
  const goToDiaryEntry = (reviewId: string) =>
    router.push({ pathname: '/diary/[id]', params: { id: reviewId } });

  const renderOverview = () => (
    <>
      <View style={styles.sectionGroup}>
        <View style={styles.section}>
          <TopCafesSection
            reviews={reviews}
            topCafeIds={topCafeIds}
            onPressCafe={(cafeId) =>
              router.push({ pathname: '/cafe/[id]', params: { id: cafeId } })
            }
            editable={false}
          />
        </View>

        <View style={styles.section}>
          <PreferencesSection preferenceIds={preferenceIds} editable={false} />
        </View>

        <View style={styles.sectionLast}>
          <RatingsSection
            ratings={reviews.map((r) => r.rating)}
            averageRating={averageRating}
            reviewsCount={reviews.length}
            favouritesCount={cafeCounts.favourites}
            savedCount={cafeCounts.saved}
          />
        </View>
      </View>

      <RecentActivitySection
        reviews={recentActivity}
        isFavorited={() => false}
        onPressEntry={goToDiaryEntry}
        onPressViewAll={() => setActiveTab('diary')}
      />
    </>
  );

  const renderDiary = () => {
    if (reviews.length === 0) {
      return (
        <View style={styles.diaryEmpty}>
          <Text style={styles.diaryEmptySubtitle}>
            {fullName} has not logged any cafes yet.
          </Text>
        </View>
      );
    }

    return (
      <DiaryList
        reviews={reviews}
        isFavorited={() => false}
        onPressEntry={goToDiaryEntry}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <TopAppBar
        title={(profile?.first_name || '').trim() || 'Profile'}
        leadingXml={ARROW_LEFT_SVG}
        onPressLeading={() => router.back()}
        leadingLabel="Go back"
        trailingXml={MORE_HORIZONTAL_SVG}
        trailingLabel="More options"
      />

      {loading ? (
        <ActivityIndicator size="large" color={colors.ink} style={styles.loader} />
      ) : notFound ? (
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>This user could not be found.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          stickyHeaderIndices={[1]}
        >
          <View style={styles.heroBlock}>
            <ProfileHero
              username={username}
              fullName={fullName}
              bio={profile?.bio ?? null}
              joinedLabel={formatJoinDate(profile?.created_at)}
              profileImageUrl={profile?.profile_image_url}
              followingCount={counts.following}
              followersCount={counts.followers}
              showEditButton={false}
            />
            <FollowButton
              targetId={id!}
              username={profile?.username}
              theyFollowMe={theyFollowMe}
              style={styles.followButton}
            />
          </View>

          <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === 'overview' ? renderOverview() : renderDiary()}
        </ScrollView>
      )}
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
  followButton: {
    alignSelf: 'stretch',
    height: 32,
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
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  diaryEmptySubtitle: {
    ...type.body1,
    lineHeight: 20,
    color: colors.greyNormal,
    textAlign: 'center',
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  notFoundText: {
    ...type.body1,
    color: colors.greyNormal,
    textAlign: 'center',
  },
});
