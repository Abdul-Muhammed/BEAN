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
import ConnectionsHeader from '../../components/social/ConnectionsHeader';
import ProfileHero from '../../components/profile/ProfileHero';
import FollowButton from '../../components/social/FollowButton';
import TopCafesSection from '../../components/profile/TopCafesSection';
import PreferencesSection from '../../components/profile/PreferencesSection';
import RatingsSection from '../../components/profile/RatingsSection';
import StatsCards from '../../components/profile/StatsCards';
import RecentActivitySection from '../../components/profile/RecentActivitySection';
import {
  getPublicProfile,
  getUserReviews,
  getFollowCounts,
  doesUserFollowMe,
} from '../../lib/follows';
import { UserReview } from '../../data/mockData';
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

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [theyFollowMe, setTheyFollowMe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
    ])
      .then(([prof, revs, cnts, follows]) => {
        if (cancelled) return;
        if (!prof) {
          setNotFound(true);
          return;
        }
        setProfile(prof);
        setReviews(revs);
        setCounts(cnts);
        setTheyFollowMe(follows);
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

  const recentActivity = useMemo(() => reviews.slice(0, 3), [reviews]);

  const username = profile?.username ? `@${profile.username}` : '@user';
  const fullName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() ||
    profile?.username ||
    'User';
  const preferenceIds: string[] = Array.isArray(profile?.preferences)
    ? (profile.preferences as string[])
    : [];

  const goToCafe = (cafeId: string) =>
    router.push({ pathname: '/cafe/[id]', params: { id: cafeId } });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ConnectionsHeader title={username} />

      {loading ? (
        <ActivityIndicator size="large" color="#1C1C1E" style={styles.loader} />
      ) : notFound ? (
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>This user could not be found.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
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

          <View style={styles.followWrap}>
            <FollowButton
              targetId={id!}
              username={profile?.username}
              theyFollowMe={theyFollowMe}
              style={styles.followButton}
            />
          </View>

          <TopCafesSection reviews={reviews} onPressCafe={(r) => goToCafe(r.cafeId)} />
          <PreferencesSection preferenceIds={preferenceIds} />
          <RatingsSection
            ratings={reviews.map((r) => r.rating)}
            averageRating={averageRating}
          />
          <StatsCards
            reviewsCount={reviews.length}
            favouritesCount={0}
            savedCount={0}
            reviewsOnly
          />
          <RecentActivitySection
            reviews={recentActivity}
            isFavorited={() => false}
            onPressEntry={(reviewId) => {
              const r = reviews.find((x) => x.id === reviewId);
              if (r) goToCafe(r.cafeId);
            }}
          />
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
    paddingBottom: 60,
  },
  loader: {
    marginVertical: 60,
  },
  followWrap: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  followButton: {
    alignSelf: 'stretch',
    height: 44,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  notFoundText: {
    fontSize: 15,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    textAlign: 'center',
  },
});
