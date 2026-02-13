import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { updateCafeWithRealImage } from '../services/googlePlaces';
import { Cafe } from '../data/mockData';

export function useCafeImages(cafes: Cafe[]) {
  const [updatedCafes, setUpdatedCafes] = useState<Cafe[]>(cafes);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const updateImages = async () => {
      // Only proceed if we have an API key, cafes to update, and not on web platform
      if (!process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || cafes.length === 0 || Platform.OS === 'web') {
        setUpdatedCafes(cafes);
        return;
      }

      setLoading(true);
      
      try {
        const updatedCafePromises = cafes.map(async (cafe) => {
          return await updateCafeWithRealImage(cafe);
        });
      
        const results = await Promise.all(updatedCafePromises);
        setUpdatedCafes(results);
      } catch (error) {
        console.error('Error updating cafe images:', error);
        setUpdatedCafes(cafes); // Fallback to original data
      }
      
      setLoading(false);
    };

    updateImages();
  }, [cafes]);

  return { cafes: updatedCafes, loading };
}