import { CafeHours } from '../data/mockData';
import { supabase } from '../lib/supabase';

// All Google Places access now goes through Supabase Edge Functions, which own
// the server-side Google key and treat the Postgres `cafes` table + Storage as
// the source of truth. The client never calls Google directly, so there is no
// Places API key in the app bundle and photos are served from our own bucket.

const DEFAULT_CAFE_IMAGE =
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800';

export interface PlacePhoto {
  photo_reference: string;
  height: number;
  width: number;
}

// Shape returned by the search/nearby Edge Functions (matches `PlaceLike` in
// the function `_shared/places.ts`).
export interface PlaceDetails {
  place_id: string;
  name: string | null;
  formatted_address?: string | null;
  rating?: number | null;
  types?: string[] | null;
  geometry?: { location: { lat: number | null; lng: number | null } };
  thumbnail_url?: string | null;
}

const NZ_BOUNDS = {
  minLat: -47.5,
  maxLat: -33.8,
  minLng: 166.0,
  maxLng: 179.5,
};

function looksLikeNzAddress(address?: string | null): boolean {
  if (!address) return false;
  return /new zealand|,\s*nz\b|\bnz$/i.test(address.trim());
}

function nzCoordinates(lat: unknown, lng: unknown): boolean | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return (
    lat >= NZ_BOUNDS.minLat &&
    lat <= NZ_BOUNDS.maxLat &&
    lng >= NZ_BOUNDS.minLng &&
    lng <= NZ_BOUNDS.maxLng
  );
}

// Client-side safety net: never render places outside NZ, even if a deployed
// Edge Function or an old cache returns stale overseas data.
export function isNzPlace(place: any): boolean {
  const lat = place?.geometry?.location?.lat ?? place?.latitude;
  const lng = place?.geometry?.location?.lng ?? place?.longitude;
  const inBounds = nzCoordinates(lat, lng);
  if (inBounds !== null) return inBounds;

  return looksLikeNzAddress(
    place?.formatted_address ?? place?.vicinity ?? place?.location ?? null
  );
}

export function isNzCafe(cafe: any): boolean {
  return isNzPlace(cafe);
}

// Search cafes around an explicit coordinate through the Supabase Edge
// Function. The function reads the shared DB/cache first and only calls Google
// on a miss. `maxPages` is capped server-side to limit Google Places spend.
export async function searchCafesNearbyByCoords(
  lat: number,
  lng: number,
  radius: number = 5000,
  maxPages: number = 1
): Promise<PlaceDetails[]> {
  try {
    const { data, error } = await supabase.functions.invoke('nearby-cafes', {
      body: { lat, lng, radius, maxPages },
    });
    if (error) {
      console.warn('Nearby cafes function error:', error.message);
      return [];
    }
    return Array.isArray(data?.results) ? data.results.filter(isNzPlace) : [];
  } catch (error) {
    console.error('Error invoking nearby cafes function:', error);
    return [];
  }
}

// Search for cafes near a free-text address. Geocoding happens server-side in
// the Edge Function (so no Geocoding key is needed on the client) and is only
// used as a fallback for profiles created before coordinates were captured.
export async function searchCafesNearby(
  location: string,
  radius: number = 5000
): Promise<PlaceDetails[]> {
  if (!location) return [];
  try {
    const { data, error } = await supabase.functions.invoke('nearby-cafes', {
      body: { address: location, radius },
    });
    if (error) {
      console.warn('Nearby cafes (address) function error:', error.message);
      return [];
    }
    return Array.isArray(data?.results) ? data.results.filter(isNzPlace) : [];
  } catch (error) {
    console.error('Error invoking nearby cafes function:', error);
    return [];
  }
}

// Search for cafes by text query through the Edge Function (DB-first, Google on
// miss).
export async function searchCafesByText(query: string): Promise<PlaceDetails[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  try {
    const { data, error } = await supabase.functions.invoke('search-cafes', {
      body: { query: trimmed },
    });
    if (error) {
      console.warn('Search cafes function error:', error.message);
      return [];
    }
    return Array.isArray(data?.results) ? data.results.filter(isNzPlace) : [];
  } catch (error) {
    console.error('Error searching cafes by text:', error);
    return [];
  }
}

// Get detailed place information through the Edge Function. Returns cached DB
// details when available; Google Place Details is only called on a miss/stale
// entry. Photos come back as Supabase Storage URLs (already cached).
export async function getPlaceDetails(placeId: string): Promise<any | null> {
  if (!placeId) return null;
  try {
    const { data, error } = await supabase.functions.invoke('cafe-details', {
      body: { placeId },
    });
    if (error) {
      console.warn('Cafe details function error:', error.message);
      return null;
    }
    return data?.result ?? null;
  } catch (error) {
    console.error('Error fetching place details:', error);
    return null;
  }
}

// Parse opening hours from Google Places API response
export function parseOpeningHours(openingHours: any): CafeHours | null {
  if (!openingHours || !openingHours.periods) {
    return null;
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentTime = now.getHours() * 100 + now.getMinutes(); // e.g., 1530 for 3:30pm

  // Find today's hours
  const todayPeriod = openingHours.periods.find((period: any) => {
    // Google uses 0 = Sunday, 1 = Monday, etc.
    return period.open && period.open.day === currentDay;
  });

  if (!todayPeriod || !todayPeriod.open) {
    return {
      openNow: false,
      currentHours: 'Closed'
    };
  }

  const openTime = parseInt(todayPeriod.open.time); // e.g., 1530
  let closeTime: number | null = null;

  // Check if there's a close time for today
  if (todayPeriod.close && todayPeriod.close.day === currentDay) {
    closeTime = parseInt(todayPeriod.close.time);
  } else {
    // Check if it closes tomorrow (e.g., open until 2am)
    const tomorrowPeriod = openingHours.periods.find((period: any) => {
      return period.close && period.close.day === (currentDay + 1) % 7;
    });
    if (tomorrowPeriod && tomorrowPeriod.close) {
      closeTime = parseInt(tomorrowPeriod.close.time);
    }
  }

  const isOpenNow = closeTime ? (currentTime >= openTime && currentTime < closeTime) : false;

  // Format time strings (e.g., 1530 -> "3:30pm")
  const formatTime = (time: number): string => {
    const hours = Math.floor(time / 100);
    const minutes = time % 100;
    const period = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
  };

  const currentHoursString = closeTime
    ? `${isOpenNow ? 'Open Now' : 'Closed'} ${formatTime(openTime)} - ${formatTime(closeTime)}`
    : `${isOpenNow ? 'Open Now' : 'Closed'} ${formatTime(openTime)}`;

  return {
    openNow: isOpenNow,
    currentHours: currentHoursString,
    weeklyHours: openingHours.periods
  };
}

// Determine amenities from Google Places types
export function determineAmenities(types: string[], rating?: number): string[] {
  const amenities: string[] = [];

  // Check for WiFi (common in cafe types)
  if (types.some(type => 
    type.includes('cafe') || 
    type.includes('restaurant') || 
    type.includes('food')
  )) {
    amenities.push('Has WiFi'); // Assume cafes have WiFi
  }

  // Check for parking
  if (types.some(type => type.includes('parking'))) {
    amenities.push('Parking');
  }

  // Top Rated (if rating >= 4.5)
  if (rating && rating >= 4.5) {
    amenities.push('Top Rated');
  }

  return amenities;
}

// Convert a search/nearby result to our Cafe format. Photos are already cached
// Storage URLs (no Google photo call here); falls back to a placeholder image.
export async function convertPlaceToCafe(place: any): Promise<any> {
  const photoUrl = place?.thumbnail_url || DEFAULT_CAFE_IMAGE;

  const types = place.types || [];
  const amenities = determineAmenities(types, place.rating);

  const geoLat = place?.geometry?.location?.lat;
  const geoLng = place?.geometry?.location?.lng;
  const latitude = typeof geoLat === 'number' ? geoLat : undefined;
  const longitude = typeof geoLng === 'number' ? geoLng : undefined;

  // Details (phone, hours, extra photos) are lazy loaded when the user opens
  // the cafe via enrichCafeWithDetails.
  return {
    id: place.place_id || place.id,
    name: place.name,
    location: place.formatted_address || place.vicinity || 'Unknown location',
    rating: place.rating || 4.0,
    image: photoUrl,
    description: `A popular cafe located at ${place.formatted_address || place.vicinity || 'this area'}. ${place.rating ? `Rated ${place.rating} stars by Google users.` : ''}`,
    reviews: [],
    place_id: place.place_id || place.id,
    phone: undefined,
    hours: undefined,
    amenities: amenities.length > 0 ? amenities : undefined,
    favoritesCount: 0,
    savedCount: 0,
    photos: [photoUrl],
    latitude,
    longitude,
  };
}

// Enrich cafe with detailed information (lazy loaded - only called when user
// views a cafe). Photos returned here are already cached Storage URLs.
export async function enrichCafeWithDetails(placeId: string): Promise<any | null> {
  if (!placeId) {
    return null;
  }

  const placeDetails = await getPlaceDetails(placeId);
  if (!placeDetails) {
    return null;
  }
  if (!isNzPlace(placeDetails)) {
    return null;
  }

  // Photos come back from the Edge Function as ready-to-use Storage URLs.
  const photos: string[] = Array.isArray(placeDetails.photos)
    ? placeDetails.photos.filter(Boolean)
    : [];

  const hours = placeDetails.opening_hours
    ? parseOpeningHours(placeDetails.opening_hours)
    : null;

  const types = placeDetails.types || [];
  const amenities = determineAmenities(types, placeDetails.rating);

  const geoLat = placeDetails?.geometry?.location?.lat;
  const geoLng = placeDetails?.geometry?.location?.lng;
  const latitude = typeof geoLat === 'number' ? geoLat : undefined;
  const longitude = typeof geoLng === 'number' ? geoLng : undefined;

  return {
    name: placeDetails.name || undefined,
    location: placeDetails.formatted_address || undefined,
    description: `A popular cafe located at ${placeDetails.formatted_address || 'this area'}. ${
      placeDetails.rating ? `Rated ${placeDetails.rating} stars by Google users.` : ''
    }`,
    image: photos[0] || undefined,
    phone: placeDetails.formatted_phone_number || undefined,
    hours: hours || undefined,
    amenities: amenities.length > 0 ? amenities : undefined,
    photos: photos.length > 0 ? photos : undefined,
    rating: placeDetails.rating || undefined,
    latitude,
    longitude,
  };
}
