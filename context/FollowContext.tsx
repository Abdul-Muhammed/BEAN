import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import {
  followUser,
  unfollowUser,
  getFollowingIds,
  getFollowCounts,
} from '../lib/follows';

interface FollowContextType {
  /** IDs the signed-in user currently follows. */
  followingIds: Set<string>;
  /** How many people follow the signed-in user (others' actions; loaded once). */
  followersCount: number;
  /** How many people the signed-in user follows (derived from followingIds). */
  followingCount: number;
  loading: boolean;
  isFollowing: (userId: string) => boolean;
  /** Optimistically follow/unfollow with rollback on failure. */
  toggleFollow: (userId: string) => Promise<void>;
}

const FollowContext = createContext<FollowContextType | undefined>(undefined);

export function FollowProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const userId = user?.id;

  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followersCount, setFollowersCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load (or clear) the social graph when the signed-in user changes.
  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setFollowingIds(new Set());
      setFollowersCount(0);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [ids, counts] = await Promise.all([
          getFollowingIds(),
          getFollowCounts(userId),
        ]);
        if (cancelled) return;
        setFollowingIds(new Set(ids));
        setFollowersCount(counts.followers);
      } catch (err) {
        if (!cancelled) {
          console.warn('Failed to load follow graph:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isFollowing = useCallback(
    (id: string) => followingIds.has(id),
    [followingIds]
  );

  const toggleFollow = useCallback(
    async (targetId: string) => {
      if (!userId) {
        console.warn('Cannot follow while signed out');
        return;
      }
      if (targetId === userId) return; // can't follow yourself

      const currentlyFollowing = followingIds.has(targetId);

      // Optimistic update.
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (currentlyFollowing) next.delete(targetId);
        else next.add(targetId);
        return next;
      });

      try {
        if (currentlyFollowing) {
          await unfollowUser(targetId);
        } else {
          await followUser(targetId);
        }
      } catch (err) {
        console.warn('Follow toggle failed:', err);
        // Roll back.
        setFollowingIds((prev) => {
          const next = new Set(prev);
          if (currentlyFollowing) next.add(targetId);
          else next.delete(targetId);
          return next;
        });
        showToast({
          variant: 'saved',
          message: currentlyFollowing
            ? "Couldn't unfollow. Try again."
            : "Couldn't follow. Try again.",
        });
      }
    },
    [userId, followingIds, showToast]
  );

  const value = useMemo<FollowContextType>(
    () => ({
      followingIds,
      followersCount,
      followingCount: followingIds.size,
      loading,
      isFollowing,
      toggleFollow,
    }),
    [followingIds, followersCount, loading, isFollowing, toggleFollow]
  );

  return <FollowContext.Provider value={value}>{children}</FollowContext.Provider>;
}

export function useFollows(): FollowContextType {
  const ctx = useContext(FollowContext);
  if (ctx === undefined) {
    throw new Error('useFollows must be used within a FollowProvider');
  }
  return ctx;
}
