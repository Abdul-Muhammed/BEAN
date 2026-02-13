import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { cafes as initialCafes, userReviews as initialUserReviews, Cafe, UserReview, Review } from '../data/mockData';

interface ReviewContextType {
  cafes: Cafe[];
  userReviews: UserReview[];
  recentActivity: UserReview[];
  bookmarkedCafes: Cafe[];
  addReview: (cafeId: string, rating: number, text: string, attributes?: string[], photos?: string[]) => void;
  addCafe: (cafe: Cafe) => void;
  toggleBookmark: (cafeId: string) => void;
  isBookmarked: (cafeId: string) => boolean;
  toggleFavorite: (cafeId: string) => void;
  isFavorited: (cafeId: string) => boolean;
  loading: boolean;
}

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export function ReviewProvider({ children }: { children: ReactNode }) {
  const [cafes, setCafes] = useState<Cafe[]>(initialCafes.slice(0, 10));
  const [userReviews, setUserReviews] = useState<UserReview[]>(initialUserReviews);
  const [bookmarkedCafeIds, setBookmarkedCafeIds] = useState<string[]>([]);
  const [favoritedCafeIds, setFavoritedCafeIds] = useState<string[]>([]);
  const { user } = useUser();

  const addCafe = (cafe: Cafe) => {
    setCafes(prev => {
      const existingIndex = prev.findIndex(c => c.id === cafe.id);
      if (existingIndex >= 0) {
        // Update existing cafe
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...cafe };
        return updated;
      } else {
        // Add new cafe
        return [...prev, cafe];
      }
    });
  };

  const toggleBookmark = (cafeId: string) => {
    setBookmarkedCafeIds(prev => {
      if (prev.includes(cafeId)) {
        return prev.filter(id => id !== cafeId);
      } else {
        return [...prev, cafeId];
      }
    });
  };

  const isBookmarked = (cafeId: string) => {
    return bookmarkedCafeIds.includes(cafeId);
  };

  const toggleFavorite = (cafeId: string) => {
    const wasFavorited = favoritedCafeIds.includes(cafeId);
    
    setFavoritedCafeIds(prev => {
      if (prev.includes(cafeId)) {
        return prev.filter(id => id !== cafeId);
      } else {
        return [...prev, cafeId];
      }
    });

    // Update favoritesCount in cafe data
    setCafes(prevCafes =>
      prevCafes.map(c => {
        if (c.id === cafeId) {
          const currentCount = c.favoritesCount || 0;
          return {
            ...c,
            favoritesCount: wasFavorited ? Math.max(0, currentCount - 1) : currentCount + 1
          };
        }
        return c;
      })
    );
  };

  const isFavorited = (cafeId: string) => {
    return favoritedCafeIds.includes(cafeId);
  };

  const bookmarkedCafes = cafes.filter(cafe => bookmarkedCafeIds.includes(cafe.id));

  const addReview = (cafeId: string, rating: number, text: string, attributes?: string[], photos?: string[]) => {
    const cafe = cafes.find(c => c.id === cafeId);
    if (!cafe) return;

    const newReview: Review = {
      id: Date.now().toString(),
      userName: user?.fullName || 'User',
      userImage: user?.imageUrl || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      rating,
      text,
      date: 'Just now',
      attributes,
      photos
    };

    const newUserReview: UserReview = {
      id: Date.now().toString(),
      cafeImage: cafe.image,
      cafeName: cafe.name,
      cafeId: cafe.id,
      rating,
      date: 'Just now',
      text,
      attributes,
      photos
    };

    setCafes(prevCafes =>
      prevCafes.map(c => {
        if (c.id === cafeId) {
          const updatedReviews = [...c.reviews, newReview];
          const newRating = updatedReviews.reduce((sum, review) => sum + review.rating, 0) / updatedReviews.length;
          return {
            ...c,
            reviews: updatedReviews,
            rating: Math.round(newRating * 10) / 10
          };
        }
        return c;
      })
    );

    setUserReviews(prev => [newUserReview, ...prev]);
  };

  return (
    <ReviewContext.Provider value={{
      cafes,
      userReviews,
      recentActivity: userReviews,
      bookmarkedCafes,
      addReview,
      addCafe,
      toggleBookmark,
      isBookmarked,
      toggleFavorite,
      isFavorited,
      loading: false
    }}>
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