import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { Cafe, UserReview, Review } from '../data/mockData';
import { supabase } from '../lib/supabase';

interface AddReviewInput {
  cafeId: string;
  rating: number;
  text: string;
  orderedItem?: string;
  attributes?: string[];
  photos?: string[];
}

interface ReviewContextType {
  cafes: Cafe[];
  userReviews: UserReview[];
  bookmarkedCafes: Cafe[];
  addReview: (input: AddReviewInput) => Promise<void>;
  addCafe: (cafe: Cafe) => void;
  getCafeById: (cafeId: string) => Cafe | undefined;
  toggleBookmark: (cafeId: string) => Promise<void>;
  isBookmarked: (cafeId: string) => boolean;
  toggleFavorite: (cafeId: string) => Promise<void>;
  isFavorited: (cafeId: string) => boolean;
  loading: boolean;
}

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DEFAULT_CAFE_IMAGE =
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800';

// Stored bookmark cafe info so we can render saved cafes even before the
// live `cafes` state has been populated from Google Places.
interface StoredBookmark {
  cafeId: string;
  name: string;
  image: string;
  location: string;
  place_id?: string;
}

function formatReviewDate(iso: string | null | undefined): string {
  if (!iso) return 'Just now';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Just now';
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

export function ReviewProvider({ children }: { children: ReactNode }) {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [userReviews, setUserReviews] = useState<UserReview[]>([]);
  const [bookmarkedCafeIds, setBookmarkedCafeIds] = useState<string[]>([]);
  const [storedBookmarks, setStoredBookmarks] = useState<Record<string, StoredBookmark>>({});
  const [favoritedCafeIds, setFavoritedCafeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const userId = user?.id;

  // Load (or clear) all per-user data when the signed-in user changes.
  useEffect(() => {
    let cancelled = false;

    const reset = () => {
      setUserReviews([]);
      setBookmarkedCafeIds([]);
      setStoredBookmarks({});
      setFavoritedCafeIds([]);
    };

    if (!userId) {
      reset();
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [reviewsRes, bookmarksRes, favoritesRes] = await Promise.all([
          supabase
            .from('reviews')
            .select('*')
            .eq('clerk_user_id', userId)
            .order('created_at', { ascending: false }),
          supabase
            .from('bookmarks')
            .select('*')
            .eq('clerk_user_id', userId)
            .order('created_at', { ascending: false }),
          supabase
            .from('favorites')
            .select('*')
            .eq('clerk_user_id', userId),
        ]);

        if (cancelled) return;

        if (reviewsRes.error) {
          console.warn('Failed to load reviews:', reviewsRes.error.message);
        } else {
          const mapped: UserReview[] = (reviewsRes.data || []).map((row: any) => ({
            id: row.id,
            cafeId: row.cafe_id,
            cafePlaceId: row.cafe_place_id || undefined,
            cafeName: row.cafe_name,
            cafeImage: row.cafe_image || '',
            rating: row.rating,
            text: row.text || '',
            orderedItem: row.ordered_item || undefined,
            date: formatReviewDate(row.created_at),
            attributes: row.attributes || undefined,
            photos: row.photos || undefined,
          }));
          setUserReviews(mapped);
        }

        if (bookmarksRes.error) {
          console.warn('Failed to load bookmarks:', bookmarksRes.error.message);
        } else {
          const ids: string[] = [];
          const stored: Record<string, StoredBookmark> = {};
          for (const row of bookmarksRes.data || []) {
            ids.push(row.cafe_id);
            stored[row.cafe_id] = {
              cafeId: row.cafe_id,
              name: row.cafe_name,
              image: row.cafe_image || '',
              location: row.cafe_location || '',
              place_id: row.cafe_place_id || undefined,
            };
          }
          setBookmarkedCafeIds(ids);
          setStoredBookmarks(stored);
        }

        if (favoritesRes.error) {
          console.warn('Failed to load favorites:', favoritesRes.error.message);
        } else {
          setFavoritedCafeIds((favoritesRes.data || []).map((row: any) => row.cafe_id));
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading user data from Supabase:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const addCafe = useCallback((cafe: Cafe) => {
    setCafes((prev) => {
      const existingIndex = prev.findIndex((c) => c.id === cafe.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...cafe };
        return updated;
      }
      return [...prev, cafe];
    });
  }, []);

  const toggleBookmark = useCallback(
    async (cafeId: string) => {
      if (!userId) {
        console.warn('Cannot bookmark while signed out');
        return;
      }
      const cafe = cafes.find((c) => c.id === cafeId);
      const isCurrentlyBookmarked = bookmarkedCafeIds.includes(cafeId);

      if (isCurrentlyBookmarked) {
        setBookmarkedCafeIds((prev) => prev.filter((id) => id !== cafeId));
        setStoredBookmarks((prev) => {
          const next = { ...prev };
          delete next[cafeId];
          return next;
        });
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('clerk_user_id', userId)
          .eq('cafe_id', cafeId);
        if (error) {
          console.warn('Failed to remove bookmark:', error.message);
          setBookmarkedCafeIds((prev) => (prev.includes(cafeId) ? prev : [...prev, cafeId]));
        }
      } else {
        if (!cafe) {
          console.warn('Cannot bookmark unknown cafe', cafeId);
          return;
        }
        setBookmarkedCafeIds((prev) => [...prev, cafeId]);
        setStoredBookmarks((prev) => ({
          ...prev,
          [cafeId]: {
            cafeId,
            name: cafe.name,
            image: cafe.image,
            location: cafe.location,
            place_id: cafe.place_id,
          },
        }));
        const { error } = await supabase.from('bookmarks').upsert(
          {
            clerk_user_id: userId,
            cafe_id: cafeId,
            cafe_place_id: cafe.place_id || null,
            cafe_name: cafe.name,
            cafe_image: cafe.image || null,
            cafe_location: cafe.location || null,
          },
          { onConflict: 'clerk_user_id,cafe_id' }
        );
        if (error) {
          console.warn('Failed to save bookmark:', error.message);
          setBookmarkedCafeIds((prev) => prev.filter((id) => id !== cafeId));
          setStoredBookmarks((prev) => {
            const next = { ...prev };
            delete next[cafeId];
            return next;
          });
        }
      }
    },
    [userId, cafes, bookmarkedCafeIds]
  );

  const isBookmarked = useCallback(
    (cafeId: string) => bookmarkedCafeIds.includes(cafeId),
    [bookmarkedCafeIds]
  );

  const toggleFavorite = useCallback(
    async (cafeId: string) => {
      if (!userId) {
        console.warn('Cannot favorite while signed out');
        return;
      }
      const isCurrentlyFav = favoritedCafeIds.includes(cafeId);

      if (isCurrentlyFav) {
        setFavoritedCafeIds((prev) => prev.filter((id) => id !== cafeId));
        setCafes((prevCafes) =>
          prevCafes.map((c) => {
            if (c.id !== cafeId) return c;
            const currentCount = c.favoritesCount || 0;
            return { ...c, favoritesCount: Math.max(0, currentCount - 1) };
          })
        );
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('clerk_user_id', userId)
          .eq('cafe_id', cafeId);
        if (error) {
          console.warn('Failed to remove favorite:', error.message);
        }
      } else {
        setFavoritedCafeIds((prev) => [...prev, cafeId]);
        setCafes((prevCafes) =>
          prevCafes.map((c) => {
            if (c.id !== cafeId) return c;
            const currentCount = c.favoritesCount || 0;
            return { ...c, favoritesCount: currentCount + 1 };
          })
        );
        const cafe = cafes.find((c) => c.id === cafeId);
        const { error } = await supabase.from('favorites').upsert(
          {
            clerk_user_id: userId,
            cafe_id: cafeId,
            cafe_place_id: cafe?.place_id || null,
          },
          { onConflict: 'clerk_user_id,cafe_id' }
        );
        if (error) {
          console.warn('Failed to save favorite:', error.message);
        }
      }
    },
    [userId, cafes, favoritedCafeIds]
  );

  const isFavorited = useCallback(
    (cafeId: string) => favoritedCafeIds.includes(cafeId),
    [favoritedCafeIds]
  );

  const buildReviewsForCafe = useCallback(
    (cafeId: string): Review[] =>
      userReviews
        .filter((review) => review.cafeId === cafeId)
        .map((review) => ({
          id: review.id,
          userName: user?.fullName || 'User',
          userImage:
            user?.imageUrl ||
            'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
          rating: review.rating,
          text: review.text,
          orderedItem: review.orderedItem,
          date: review.date,
          attributes: review.attributes,
          photos: review.photos,
        })),
    [userReviews, user]
  );

  const getCafeById = useCallback(
    (cafeId: string): Cafe | undefined => {
      const live = cafes.find((c) => c.id === cafeId);
      if (live) return live;

      const stored = storedBookmarks[cafeId];
      if (stored) {
        return {
          id: stored.cafeId,
          name: stored.name,
          location: stored.location,
          image: stored.image || DEFAULT_CAFE_IMAGE,
          rating: 0,
          description: stored.location ? `A cafe located at ${stored.location}.` : '',
          reviews: buildReviewsForCafe(cafeId),
          place_id: stored.place_id || cafeId,
          photos: stored.image ? [stored.image] : [DEFAULT_CAFE_IMAGE],
        };
      }

      const diaryReview = userReviews.find((review) => review.cafeId === cafeId);
      if (diaryReview) {
        const image = diaryReview.cafeImage || DEFAULT_CAFE_IMAGE;
        return {
          id: diaryReview.cafeId,
          name: diaryReview.cafeName,
          location: '',
          image,
          rating: diaryReview.rating,
          description: '',
          reviews: buildReviewsForCafe(cafeId),
          place_id: diaryReview.cafePlaceId || cafeId,
          photos: [image],
        };
      }

      return undefined;
    },
    [cafes, storedBookmarks, userReviews, buildReviewsForCafe]
  );

  // Build the list of bookmarked cafes by combining stored bookmark data
  // (always available) with the live `cafes` entry (richer info if loaded).
  const bookmarkedCafes: Cafe[] = bookmarkedCafeIds
    .map((id) => getCafeById(id) || null)
    .filter((c): c is Cafe => c !== null);

  const addReview = useCallback(
    async ({ cafeId, rating, text, orderedItem, attributes, photos }: AddReviewInput) => {
      const cafe = cafes.find((c) => c.id === cafeId);
      if (!cafe) {
        console.warn('Cannot add review for unknown cafe', cafeId);
        return;
      }
      if (!userId) {
        console.warn('Cannot add review while signed out');
        return;
      }

      const tempId = `temp_${Date.now()}`;
      const newReview: Review = {
        id: tempId,
        userName: user?.fullName || 'User',
        userImage:
          user?.imageUrl ||
          'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        rating,
        text,
        orderedItem,
        date: 'Just now',
        attributes,
        photos,
      };

      const newUserReview: UserReview = {
        id: tempId,
        cafeImage: cafe.image,
        cafeName: cafe.name,
        cafeId: cafe.id,
        cafePlaceId: cafe.place_id,
        rating,
        date: 'Just now',
        text,
        orderedItem,
        attributes,
        photos,
      };

      setCafes((prevCafes) =>
        prevCafes.map((c) => {
          if (c.id !== cafeId) return c;
          const updatedReviews = [...c.reviews, newReview];
          const newRating =
            updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length;
          return {
            ...c,
            reviews: updatedReviews,
            rating: Math.round(newRating * 10) / 10,
          };
        })
      );
      setUserReviews((prev) => [newUserReview, ...prev]);

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          clerk_user_id: userId,
          cafe_id: cafeId,
          cafe_place_id: cafe.place_id || null,
          cafe_name: cafe.name,
          cafe_image: cafe.image || null,
          rating,
          text,
          ordered_item: orderedItem || null,
          attributes: attributes || [],
          photos: photos || [],
        })
        .select()
        .single();

      if (error) {
        console.warn('Failed to save review:', error.message);
        setUserReviews((prev) => prev.filter((r) => r.id !== tempId));
        setCafes((prevCafes) =>
          prevCafes.map((c) => {
            if (c.id !== cafeId) return c;
            const filteredReviews = c.reviews.filter((r) => r.id !== tempId);
            const newRating = filteredReviews.length
              ? filteredReviews.reduce((sum, r) => sum + r.rating, 0) / filteredReviews.length
              : 0;
            return {
              ...c,
              reviews: filteredReviews,
              rating: Math.round(newRating * 10) / 10,
            };
          })
        );
        return;
      }

      if (data) {
        setUserReviews((prev) =>
          prev.map((r) =>
            r.id === tempId
              ? {
                  ...r,
                  id: data.id,
                  date: formatReviewDate(data.created_at),
                }
              : r
          )
        );
        setCafes((prevCafes) =>
          prevCafes.map((c) => {
            if (c.id !== cafeId) return c;
            return {
              ...c,
              reviews: c.reviews.map((r) =>
                r.id === tempId ? { ...r, id: data.id, date: formatReviewDate(data.created_at) } : r
              ),
            };
          })
        );
      }
    },
    [cafes, userId, user]
  );

  return (
    <ReviewContext.Provider
      value={{
        cafes,
        userReviews,
        bookmarkedCafes,
        addReview,
        addCafe,
        getCafeById,
        toggleBookmark,
        isBookmarked,
        toggleFavorite,
        isFavorited,
        loading,
      }}
    >
      {children}
    </ReviewContext.Provider>
  );
}

export function useReviews() {
  const context = useContext(ReviewContext);
  if (context === undefined) {
    throw new Error('useReviews must be used within a ReviewProvider');
  }
  return context;
}
