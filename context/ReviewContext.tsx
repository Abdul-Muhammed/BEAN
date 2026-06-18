import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { router } from 'expo-router';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { Cafe, UserReview, Review } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { uploadReviewPhotos } from '../lib/storage';
import { triggerSaveHaptic } from '../lib/haptics';

interface AddReviewInput {
  cafeId: string;
  rating: number;
  text: string;
  orderedItem?: string;
  attributes?: string[];
  photos?: string[];
  // Base64-encoded image data (aligned with `photos`) used to upload the
  // pictures to Supabase Storage so the persisted review holds durable URLs
  // instead of fragile local file:// URIs.
  photoUploads?: { base64: string }[];
  visitDate?: Date;
}

interface UpdateReviewInput {
  reviewId: string;
  cafeId: string;
  rating: number;
  text: string;
  orderedItem?: string;
  attributes?: string[];
  // Existing photo URLs to keep (already in Storage).
  photos?: string[];
  // Newly added images (base64) to upload and append.
  photoUploads?: { base64: string }[];
  visitDate?: Date;
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface ReviewContextType {
  cafes: Cafe[];
  userReviews: UserReview[];
  bookmarkedCafes: Cafe[];
  favoritedCafeIds: string[];
  favoritedCafes: Cafe[];
  // Resolves to the persisted review id on success (or the optimistic temp id /
  // undefined if the insert was skipped or failed), so callers can deep-link to
  // the new review.
  addReview: (input: AddReviewInput) => Promise<string | undefined>;
  // Resolves true when the review was successfully updated in the backend.
  updateReview: (input: UpdateReviewInput) => Promise<boolean>;
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

function isPlaceholderImage(uri: string | undefined | null): boolean {
  return !uri || uri === DEFAULT_CAFE_IMAGE;
}

function hasRealPhotos(photos: string[] | undefined | null): boolean {
  return Array.isArray(photos) && photos.some((p) => !isPlaceholderImage(p));
}

// Stored bookmark cafe info so we can render saved cafes even before the
// live `cafes` state has been populated from Google Places.
interface StoredBookmark {
  cafeId: string;
  name: string;
  image: string;
  location: string;
  place_id?: string;
  rating?: number;
}

function formatReviewDate(iso: string | null | undefined): string {
  if (!iso) return 'Just now';
  // Bare 'YYYY-MM-DD' (e.g. from visit_date) should display as the literal
  // date the user picked, not be shifted by the local timezone.
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch;
    const month = MONTH_NAMES[Number(m) - 1];
    return `${Number(d)} ${month}`;
  }
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
  const { user } = useAuth();
  const { showToast } = useToast();
  const { profile } = useUserProfile();
  const userId = user?.id;
  // Reviewer name/avatar come from the profiles table (set during onboarding),
  // not auth metadata — Apple Sign-In leaves metadata empty, which previously
  // showed a literal "User" and a stock photo.
  const profileFullName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  const displayName = profile?.username || profileFullName || 'User';
  const displayImage = profile?.profile_image_url || '';

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
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
          supabase
            .from('bookmarks')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
          supabase
            .from('favorites')
            .select('*')
            .eq('user_id', userId),
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
            rating: typeof row.rating === 'string' ? parseFloat(row.rating) : row.rating,
            text: row.text || '',
            orderedItem: row.ordered_item || undefined,
            date: formatReviewDate(row.visit_date || row.created_at),
            visitDate: row.visit_date || undefined,
            attributes: row.attributes || undefined,
            photos: row.photos || undefined,
          }));
          const deduped = Array.from(
            new Map(mapped.map((r) => [r.id, r])).values()
          );
          setUserReviews(deduped);
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
              rating:
                typeof row.cafe_rating === 'string'
                  ? parseFloat(row.cafe_rating)
                  : row.cafe_rating ?? undefined,
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
        const existing = prev[existingIndex];
        const merged = { ...existing, ...cafe };
        // Don't let a stock placeholder coming from search/recent overwrite a
        // real image/photos already loaded for this cafe (e.g. from the map or
        // a prior detail enrichment).
        if (isPlaceholderImage(cafe.image) && !isPlaceholderImage(existing.image)) {
          merged.image = existing.image;
        }
        if (!hasRealPhotos(cafe.photos) && hasRealPhotos(existing.photos)) {
          merged.photos = existing.photos;
        }
        // Likewise, a recent-search/cold-start entry with rating 0 shouldn't
        // wipe a real rating already loaded for this cafe.
        if (!cafe.rating && existing.rating) {
          merged.rating = existing.rating;
        }
        const updated = [...prev];
        updated[existingIndex] = merged;
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
      triggerSaveHaptic();
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
          .eq('user_id', userId)
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
        showToast({
          variant: 'saved',
          message: 'Cafe has been saved!',
          actionLabel: 'View',
          onAction: () => router.push(`/cafe/${cafeId}`),
        });
        setBookmarkedCafeIds((prev) => [...prev, cafeId]);
        setStoredBookmarks((prev) => ({
          ...prev,
          [cafeId]: {
            cafeId,
            name: cafe.name,
            image: cafe.image,
            location: cafe.location,
            place_id: cafe.place_id,
            rating: cafe.rating,
          },
        }));
        const { error } = await supabase.from('bookmarks').upsert(
          {
            user_id: userId,
            cafe_id: cafeId,
            cafe_place_id: cafe.place_id || null,
            cafe_name: cafe.name,
            cafe_image: cafe.image || null,
            cafe_location: cafe.location || null,
            cafe_rating: cafe.rating ?? null,
          },
          { onConflict: 'user_id,cafe_id' }
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
    [userId, cafes, bookmarkedCafeIds, showToast]
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
      triggerSaveHaptic();
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
          .eq('user_id', userId)
          .eq('cafe_id', cafeId);
        if (error) {
          console.warn('Failed to remove favorite:', error.message);
        }
      } else {
        showToast({
          variant: 'favorite',
          message: 'Cafe has been favorited!',
          actionLabel: 'View',
          onAction: () => router.push(`/cafe/${cafeId}`),
        });
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
            user_id: userId,
            cafe_id: cafeId,
            cafe_place_id: cafe?.place_id || null,
          },
          { onConflict: 'user_id,cafe_id' }
        );
        if (error) {
          console.warn('Failed to save favorite:', error.message);
        }
      }
    },
    [userId, cafes, favoritedCafeIds, showToast]
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
          userName: displayName,
          userImage: displayImage,
          rating: review.rating,
          text: review.text,
          orderedItem: review.orderedItem,
          date: review.date,
          attributes: review.attributes,
          photos: review.photos,
        })),
    [userReviews, displayName, displayImage]
  );

  const getCafeById = useCallback(
    (cafeId: string): Cafe | undefined => {
      const live = cafes.find((c) => c.id === cafeId);
      if (live) {
        // Live cafes come from Google Places with no personal reviews attached.
        // Merge in the current user's saved reviews so they show on the detail
        // page, de-duping anything already present on the live object.
        const own = buildReviewsForCafe(cafeId);
        if (own.length === 0) return live;
        const merged = [
          ...own,
          ...live.reviews.filter((r) => !own.some((o) => o.id === r.id)),
        ];
        return { ...live, reviews: merged };
      }

      const stored = storedBookmarks[cafeId];
      if (stored) {
        return {
          id: stored.cafeId,
          name: stored.name,
          location: stored.location,
          image: stored.image || DEFAULT_CAFE_IMAGE,
          rating: stored.rating ?? 0,
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

  // Favorites store no metadata snapshot (only the cafe id), so we can only
  // resolve a full Cafe for the ones currently loaded in `cafes`. The Lists
  // screen still uses `favoritedCafeIds` for an accurate count and falls back
  // to placeholders for any cafe we can't resolve.
  const favoritedCafes: Cafe[] = favoritedCafeIds
    .map((id) => getCafeById(id) || null)
    .filter((c): c is Cafe => c !== null);

  const addReview = useCallback(
    async ({
      cafeId,
      rating,
      text,
      orderedItem,
      attributes,
      photos,
      photoUploads,
      visitDate,
    }: AddReviewInput) => {
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
      const visitDateString = visitDate ? formatDateOnly(visitDate) : null;
      const optimisticDisplayDate = visitDateString
        ? formatReviewDate(visitDateString)
        : 'Just now';

      const newReview: Review = {
        id: tempId,
        userName: displayName,
        userImage: displayImage,
        rating,
        text,
        orderedItem,
        date: optimisticDisplayDate,
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
        date: optimisticDisplayDate,
        visitDate: visitDateString || undefined,
        text,
        orderedItem,
        attributes,
        photos,
      };

      setCafes((prevCafes) =>
        prevCafes.map((c) => {
          if (c.id !== cafeId) return c;
          const updatedReviews = [...c.reviews.filter((r) => r.id !== tempId), newReview];
          const newRating =
            updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length;
          return {
            ...c,
            reviews: updatedReviews,
            rating: Math.round(newRating * 10) / 10,
          };
        })
      );
      setUserReviews((prev) => [newUserReview, ...prev.filter((r) => r.id !== tempId)]);

      // Upload the picked images to Supabase Storage and persist the public
      // URLs (not the device-local file:// URIs). If upload fails we fall back
      // to whatever was passed so the review still saves.
      let photosForInsert = photos || [];
      if (photoUploads && photoUploads.length > 0) {
        try {
          const uploaded = await uploadReviewPhotos(userId, photoUploads);
          if (uploaded.length > 0) {
            photosForInsert = uploaded;
          }
        } catch (uploadErr) {
          console.warn('Failed to upload review photos:', uploadErr);
        }
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          user_id: userId,
          cafe_id: cafeId,
          cafe_place_id: cafe.place_id || null,
          cafe_name: cafe.name,
          cafe_image: cafe.image || null,
          rating,
          text,
          ordered_item: orderedItem || null,
          attributes: attributes || [],
          photos: photosForInsert,
          visit_date: visitDateString,
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
        const persistedRating =
          typeof data.rating === 'string' ? parseFloat(data.rating) : data.rating;
        const persistedVisitDate: string | undefined =
          data.visit_date || visitDateString || undefined;
        const persistedDisplayDate = formatReviewDate(
          data.visit_date || data.created_at
        );

        setUserReviews((prev) => {
          const filtered = prev.filter(
            (r) => r.id !== tempId && r.id !== data.id
          );
          return [
            {
              ...newUserReview,
              id: data.id,
              rating: persistedRating,
              date: persistedDisplayDate,
              visitDate: persistedVisitDate,
              photos: data.photos ?? newUserReview.photos,
            },
            ...filtered,
          ];
        });

        setCafes((prevCafes) =>
          prevCafes.map((c) => {
            if (c.id !== cafeId) return c;
            const filtered = c.reviews.filter(
              (r) => r.id !== tempId && r.id !== data.id
            );
            const updated = [
              ...filtered,
              {
                ...newReview,
                id: data.id,
                rating: persistedRating,
                date: persistedDisplayDate,
                photos: data.photos ?? newReview.photos,
              },
            ];
            const avg =
              updated.reduce((sum, r) => sum + r.rating, 0) / updated.length;
            return {
              ...c,
              reviews: updated,
              rating: Math.round(avg * 10) / 10,
            };
          })
        );

        return data.id;
      }
    },
    [cafes, userId, user]
  );

  const updateReview = useCallback(
    async ({
      reviewId,
      cafeId,
      rating,
      text,
      orderedItem,
      attributes,
      photos,
      photoUploads,
      visitDate,
    }: UpdateReviewInput): Promise<boolean> => {
      if (!userId) {
        console.warn('Cannot update review while signed out');
        return false;
      }

      const visitDateString = visitDate ? formatDateOnly(visitDate) : null;

      // Keep the existing (already-uploaded) URLs and append any freshly added
      // images. If an upload fails we still save the review with what we have.
      let finalPhotos = photos ? [...photos] : [];
      if (photoUploads && photoUploads.length > 0) {
        try {
          const uploaded = await uploadReviewPhotos(userId, photoUploads);
          finalPhotos = [...finalPhotos, ...uploaded];
        } catch (uploadErr) {
          console.warn('Failed to upload review photos:', uploadErr);
        }
      }

      const { data, error } = await supabase
        .from('reviews')
        .update({
          rating,
          text,
          ordered_item: orderedItem || null,
          attributes: attributes || [],
          photos: finalPhotos,
          visit_date: visitDateString,
        })
        .eq('id', reviewId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error || !data) {
        console.warn('Failed to update review:', error?.message);
        return false;
      }

      const persistedRating =
        typeof data.rating === 'string' ? parseFloat(data.rating) : data.rating;
      const persistedVisitDate: string | undefined =
        data.visit_date || visitDateString || undefined;
      const persistedDisplayDate = formatReviewDate(data.visit_date || data.created_at);

      setUserReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                rating: persistedRating,
                text: data.text ?? text,
                orderedItem: data.ordered_item ?? (orderedItem || undefined),
                attributes: data.attributes ?? attributes,
                photos: data.photos ?? finalPhotos,
                visitDate: persistedVisitDate,
                date: persistedDisplayDate,
              }
            : r
        )
      );

      // Keep the cafe's embedded reviews + average rating consistent.
      setCafes((prevCafes) =>
        prevCafes.map((c) => {
          if (c.id !== cafeId) return c;
          const updated = c.reviews.map((rv) =>
            rv.id === reviewId
              ? {
                  ...rv,
                  rating: persistedRating,
                  text: data.text ?? text,
                  orderedItem: data.ordered_item ?? (orderedItem || undefined),
                  attributes: data.attributes ?? attributes,
                  photos: data.photos ?? finalPhotos,
                  date: persistedDisplayDate,
                }
              : rv
          );
          const avg = updated.length
            ? updated.reduce((sum, r) => sum + r.rating, 0) / updated.length
            : 0;
          return { ...c, reviews: updated, rating: Math.round(avg * 10) / 10 };
        })
      );

      return true;
    },
    [userId]
  );

  return (
    <ReviewContext.Provider
      value={{
        cafes,
        userReviews,
        bookmarkedCafes,
        favoritedCafeIds,
        favoritedCafes,
        addReview,
        updateReview,
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