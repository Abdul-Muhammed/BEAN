import { supabase } from './supabase';
import { UserReview } from '../data/mockData';

/** Minimal public-facing profile shape used by list rows and the user profile screen. */
export interface PublicUser {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
}

const PUBLIC_USER_COLUMNS = 'id, username, first_name, last_name, profile_image_url';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Mirrors ReviewContext.formatReviewDate so other users' diary cards read the
// same way as your own. Bare 'YYYY-MM-DD' visit dates show literally (no TZ shift).
function formatReviewDate(iso: string | null | undefined): string {
  if (!iso) return 'Just now';
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (dateOnly) {
    const [, , m, d] = dateOnly;
    return `${Number(d)} ${MONTH_NAMES[Number(m) - 1]}`;
  }
  const date = new Date(iso);
  if (isNaN(date.getTime())) return 'Just now';
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

async function getMyId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

/** Create a follow edge (me -> targetId). Idempotent via upsert on the PK. */
export async function followUser(targetId: string): Promise<void> {
  const me = await getMyId();
  const { error } = await supabase
    .from('follows')
    .upsert(
      { follower_id: me, following_id: targetId },
      { onConflict: 'follower_id,following_id', ignoreDuplicates: true }
    );
  if (error) throw new Error(`Failed to follow: ${error.message}`);
}

/** Remove the follow edge (me -> targetId). */
export async function unfollowUser(targetId: string): Promise<void> {
  const me = await getMyId();
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', me)
    .eq('following_id', targetId);
  if (error) throw new Error(`Failed to unfollow: ${error.message}`);
}

/** IDs of everyone the signed-in user currently follows (seeds FollowContext). */
export async function getFollowingIds(): Promise<string[]> {
  const me = await getMyId();
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', me);
  if (error) throw new Error(`Failed to load following: ${error.message}`);
  return (data ?? []).map((row: any) => row.following_id as string);
}

/** Whether `targetId` follows the signed-in user (drives "Follow Back"). */
export async function doesUserFollowMe(targetId: string): Promise<boolean> {
  const me = await getMyId();
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', targetId)
    .eq('following_id', me);
  if (error) {
    console.warn('Failed to check follow-back state:', error.message);
    return false;
  }
  return (count ?? 0) > 0;
}

/** Live follower/following counts for any user via head-only count queries. */
export async function getFollowCounts(
  userId: string
): Promise<{ followers: number; following: number }> {
  const [followersRes, followingRes] = await Promise.all([
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId),
  ]);
  return {
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
  };
}

// There's no FK from follows -> profiles (both point at auth.users), so PostgREST
// can't embed the profile. Fetch the edge ids, then the profiles, in two steps.
async function fetchProfilesByIds(ids: string[]): Promise<PublicUser[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_USER_COLUMNS)
    .in('id', ids);
  if (error) throw new Error(`Failed to load profiles: ${error.message}`);
  const byId = new Map((data ?? []).map((p: any) => [p.id, p as PublicUser]));
  // Preserve the incoming (recency) order of `ids`.
  return ids.map((id) => byId.get(id)).filter((p): p is PublicUser => Boolean(p));
}

/** Users who follow `userId`, newest follow first. */
export async function getFollowers(userId: string): Promise<PublicUser[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to load followers: ${error.message}`);
  return fetchProfilesByIds((data ?? []).map((r: any) => r.follower_id));
}

/** Users `userId` follows, newest follow first. */
export async function getFollowing(userId: string): Promise<PublicUser[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to load following: ${error.message}`);
  return fetchProfilesByIds((data ?? []).map((r: any) => r.following_id));
}

/** Search profiles by username / first / last name. Excludes self and the
 *  temp_* placeholder handles assigned before onboarding picks a username. */
export async function searchProfiles(query: string): Promise<PublicUser[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];
  const me = await getMyId();
  // Escape PostgREST/ilike wildcards so the user's literal text is matched.
  const escaped = trimmed.replace(/[\\%_,]/g, (ch) => `\\${ch}`);
  const pattern = `%${escaped}%`;

  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_USER_COLUMNS)
    .neq('id', me)
    .not('username', 'ilike', 'temp\\_%')
    .or(
      `username.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`
    )
    .limit(30);
  if (error) throw new Error(`Failed to search users: ${error.message}`);
  return (data ?? []) as PublicUser[];
}

/** Recently-joined, onboarded users you don't already follow (and not yourself). */
export async function getRecommended(): Promise<PublicUser[]> {
  const me = await getMyId();
  const followingIds = await getFollowingIds();
  const excluded = new Set([me, ...followingIds]);

  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_USER_COLUMNS)
    .eq('onboarding_completed', true)
    .not('username', 'ilike', 'temp\\_%')
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) throw new Error(`Failed to load recommendations: ${error.message}`);

  return (data ?? [])
    .filter((p: any) => !excluded.has(p.id))
    .slice(0, 20) as PublicUser[];
}

/** Full profile row for any user (used by the read-only profile screen). */
export async function getPublicProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load profile: ${error.message}`);
  return data;
}

/** Another user's reviews mapped to the UserReview shape the profile sections
 *  expect, newest-first. RLS allows any signed-in user to read reviews. */
export async function getUserReviews(userId: string): Promise<UserReview[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to load reviews: ${error.message}`);

  const mapped: UserReview[] = (data ?? []).map((row: any) => ({
    id: row.id,
    cafeId: row.cafe_id,
    cafePlaceId: row.cafe_place_id || undefined,
    cafeName: row.cafe_name,
    cafeImage: row.cafe_image || '',
    rating: typeof row.rating === 'string' ? parseFloat(row.rating) : row.rating,
    text: row.text || '',
    orderedItem: row.ordered_item || undefined,
    date: formatReviewDate(row.visit_date || row.created_at),
    visitDate: row.visit_date || undefined,
    attributes: row.attributes || undefined,
    photos: row.photos || undefined,
  }));
  return Array.from(new Map(mapped.map((r) => [r.id, r])).values());
}
