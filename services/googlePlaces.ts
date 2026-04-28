import { Platform } from 'react-native';
import { CafeHours } from '../data/mockData';

// Google Places API integration
const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

// In-memory caches to prevent duplicate API calls
const searchCache = new Map<string, PlaceDetails[]>();
const detailsCache = new Map<string, any>();
const photoCache = new Map<string, string>();

export interface PlacePhoto {
  photo_reference: string;
  height: number;
  width: number;
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  photos?: PlacePhoto[];
  rating?: number;
  formatted_address?: string;
}

// Geocode an address to get coordinates
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (Platform.OS === 'web') {
    console.warn('Google Places API is not available on web platform due to CORS restrictions');
    return null;
  }

  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('Google Places API key not found');
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_PLACES_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'OVER_QUERY_LIMIT') {
      console.warn('Google Places API quota exceeded');
      return null;
    }

    if (data.status !== 'OK' || !data.results.length) {
      console.warn('Geocoding error:', data.status);
      return null;
    }

    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

// Search for a place by name and location
export async function searchPlace(name: string, location: string): Promise<PlaceDetails | null> {
  // Google Places API doesn't work in web browsers due to CORS restrictions
  if (Platform.OS === 'web') {
    console.warn('Google Places API is not available on web platform due to CORS restrictions');
    return null;
  }

  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('Google Places API key not found');
    return null;
  }

  try {
    const query = `${name} ${location}`;
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'OVER_QUERY_LIMIT') {
      console.warn('Google Places API quota exceeded');
      return null;
    }
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.warn('Google Places API error:', data.status);
      return null;
    }
    
    if (data.results && data.results.length > 0) {
      return data.results[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error searching place:', error);
    return null;
  }
}

// Get photo URL from photo reference
export function getPhotoUrl(photoReference: string, maxWidth: number = 800): string {
  if (!GOOGLE_PLACES_API_KEY) {
    return '';
  }
  
  // Check cache first
  const cacheKey = `${photoReference}_${maxWidth}`;
  if (photoCache.has(cacheKey)) {
    return photoCache.get(cacheKey)!;
  }
  
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
  // Cache the URL
  photoCache.set(cacheKey, url);
  return url;
}

// Update cafe data with real images
export async function updateCafeWithRealImage(cafe: any) {
  try {
    const placeDetails = await searchPlace(cafe.name, cafe.location);
  
    if (placeDetails && placeDetails.photos && placeDetails.photos.length > 0) {
      const photoUrl = getPhotoUrl(placeDetails.photos[0].photo_reference);
      return {
        ...cafe,
        image: photoUrl,
        place_id: placeDetails.place_id
      };
    }
  } catch (error) {
    console.error(`Error updating image for ${cafe.name}:`, error);
  }
  
  return cafe; // Return original if no photo found
}

// Strip a comma-separated address down to a more reliably geocodable form
// by removing leading street number and de-duplicating tokens (e.g.
// "Auckland, Auckland" -> "Auckland"). Falls back gracefully if the input
// doesn't match expected patterns.
function simplifyAddress(address: string): string | null {
  if (!address) return null;

  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length === 0) return null;

  // Drop the very first part if it looks like just a street number (e.g. "35").
  const filtered = parts.filter((p, idx) => !(idx === 0 && /^\d+\w?$/.test(p)));

  // De-duplicate consecutive/repeating tokens, case-insensitive.
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const part of filtered) {
    const key = part.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(part);
    }
  }

  // Prefer the suburb/city/country tail (last 3 parts max) for a more
  // reliable geocode hit than a full street address.
  const tail = deduped.slice(-3);
  return tail.join(', ');
}

// Search cafes around an explicit coordinate. Skips the Geocoding API
// entirely, which avoids `REQUEST_DENIED` failures when the project's
// Geocoding API isn't enabled but Places is.
export async function searchCafesNearbyByCoords(
  lat: number,
  lng: number,
  radius: number = 5000
): Promise<PlaceDetails[]> {
  if (Platform.OS === 'web') {
    console.warn('Google Places API is not available on web platform due to CORS restrictions');
    return [];
  }

  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('Google Places API key not found');
    return [];
  }

  try {
    const placesResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=cafe&key=${GOOGLE_PLACES_API_KEY}`
    );

    const placesData = await placesResponse.json();

    if (placesData.status === 'OVER_QUERY_LIMIT') {
      console.warn('Google Places API quota exceeded');
      return [];
    }

    if (placesData.status === 'REQUEST_DENIED') {
      console.warn(
        'Google Places Nearby Search returned REQUEST_DENIED. Check that the Places API is enabled, billing is active, and the API key restrictions allow requests from this app. Details:',
        placesData.error_message || '(no error_message)'
      );
      return [];
    }

    if (placesData.status !== 'OK' && placesData.status !== 'ZERO_RESULTS') {
      console.warn('Google Places API error:', placesData.status, placesData.error_message);
      return [];
    }

    return placesData.results || [];
  } catch (error) {
    console.error('Error searching cafes nearby by coords:', error);
    return [];
  }
}

// Search for cafes in a specific location
export async function searchCafesNearby(location: string, radius: number = 5000): Promise<PlaceDetails[]> {
  if (Platform.OS === 'web') {
    console.warn('Google Places API is not available on web platform due to CORS restrictions');
    return [];
  }

  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('Google Places API key not found');
    return [];
  }

  try {
    // First, geocode the location to get coordinates.
    // Bias to NZ since the app is launched in New Zealand; this avoids
    // ambiguous global matches when addresses contain duplicated tokens
    // (e.g. "Auckland, Auckland, New Zealand").
    const geocodeAttempt = async (address: string) => {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&region=nz&components=country:NZ&key=${GOOGLE_PLACES_API_KEY}`
      );
      return response.json();
    };

    let geocodeData = await geocodeAttempt(location);

    if (geocodeData.status === 'REQUEST_DENIED') {
      console.warn(
        'Geocoding API returned REQUEST_DENIED. The Places API key likely does not have the Geocoding API enabled. Details:',
        geocodeData.error_message || '(no error_message)'
      );
      return [];
    }

    // Fallback: if the full address fails (often because of duplicated
    // suburb/city tokens), retry with a simplified version that drops
    // any duplicate parts and street number.
    if (geocodeData.status !== 'OK' || !geocodeData.results.length) {
      const simplified = simplifyAddress(location);
      if (simplified && simplified !== location) {
        console.warn(
          `Geocode failed for "${location}" (${geocodeData.status}); retrying with "${simplified}"`
        );
        geocodeData = await geocodeAttempt(simplified);
      }
    }

    if (geocodeData.status !== 'OK' || !geocodeData.results.length) {
      console.warn(
        `Could not geocode location: ${location} (status: ${geocodeData.status})`
      );
      return [];
    }

    const { lat, lng } = geocodeData.results[0].geometry.location;

    return searchCafesNearbyByCoords(lat, lng, radius);
  } catch (error) {
    console.error('Error searching cafes nearby:', error);
    return [];
  }
}

// Search for cafes by text query
export async function searchCafesByText(query: string): Promise<PlaceDetails[]> {
  if (Platform.OS === 'web') {
    console.warn('Google Places API is not available on web platform due to CORS restrictions');
    return [];
  }

  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('Google Places API key not found');
    return [];
  }

  // Check cache first
  const cacheKey = query.toLowerCase().trim();
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' cafe coffee')}&key=${GOOGLE_PLACES_API_KEY}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OVER_QUERY_LIMIT') {
      console.warn('Google Places API quota exceeded');
      return [];
    }
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.warn('Google Places API error:', data.status);
      return [];
    }
    
    const results = data.results || [];
    // Cache the results
    searchCache.set(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Error searching cafes by text:', error);
    return [];
  }
}

// Get detailed place information using Place Details API
export async function getPlaceDetails(placeId: string): Promise<any | null> {
  if (Platform.OS === 'web') {
    console.warn('Google Places API is not available on web platform due to CORS restrictions');
    return null;
  }

  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('Google Places API key not found');
    return null;
  }

  // Check cache first
  if (detailsCache.has(placeId)) {
    return detailsCache.get(placeId)!;
  }

  try {
    const fields = [
      'place_id',
      'name',
      'formatted_address',
      'formatted_phone_number',
      'opening_hours',
      'photos',
      'rating',
      'types'
    ].join(',');

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_PLACES_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'OVER_QUERY_LIMIT') {
      console.warn('Google Places API quota exceeded');
      return null;
    }

    if (data.status !== 'OK') {
      console.warn('Google Places API error:', data.status);
      return null;
    }

    const result = data.result || null;
    // Cache the result
    if (result) {
      detailsCache.set(placeId, result);
    }
    return result;
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

// Convert Google Places result to our Cafe format (BASIC - no Place Details API call)
// This returns only data available from Text Search results to avoid expensive API calls
export async function convertPlaceToCafe(place: any): Promise<any> {
  // Use first photo from Text Search results if available (no API call needed for URL generation)
  const photoUrl = place.photos && place.photos.length > 0 
    ? getPhotoUrl(place.photos[0].photo_reference)
    : 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800';

  // Basic amenities from types (no Place Details needed)
  const types = place.types || [];
  const amenities = determineAmenities(types, place.rating);

  // Return basic cafe data - NO Place Details API call here
  // Details will be lazy loaded when user clicks on cafe
  return {
    id: place.place_id || place.id,
    name: place.name,
    location: place.formatted_address || place.vicinity || 'Unknown location',
    rating: place.rating || 4.0,
    image: photoUrl,
    description: `A popular cafe located at ${place.formatted_address || place.vicinity}. ${place.rating ? `Rated ${place.rating} stars by Google users.` : ''}`,
    reviews: [], // Empty reviews array
    place_id: place.place_id || place.id,
    phone: undefined, // Will be populated by enrichCafeWithDetails
    hours: undefined, // Will be populated by enrichCafeWithDetails
    amenities: amenities.length > 0 ? amenities : undefined,
    favoritesCount: 0,
    savedCount: 0,
    photos: [photoUrl] // Single photo for now, will be enriched later
  };
}

// Enrich cafe with detailed information (lazy loaded - only called when user views cafe)
export async function enrichCafeWithDetails(placeId: string): Promise<any | null> {
  if (!placeId) {
    return null;
  }

  // Get Place Details (cached)
  const placeDetails = await getPlaceDetails(placeId);
  if (!placeDetails) {
    return null;
  }

  // Get photos (limit to 3 for cost reduction)
  const allPhotos = placeDetails.photos || [];
  let photos: string[] = [];
  
  if (allPhotos.length > 0) {
    // Limit to 3 photos max (was 10 before)
    const photoCount = Math.min(allPhotos.length, 3);
    photos = allPhotos.slice(0, photoCount).map((photo: PlacePhoto) => 
      getPhotoUrl(photo.photo_reference, 1200)
    );
  }

  // Parse hours
  const hours = placeDetails.opening_hours 
    ? parseOpeningHours(placeDetails.opening_hours)
    : null;

  // Determine amenities from detailed types
  const types = placeDetails.types || [];
  const amenities = determineAmenities(types, placeDetails.rating);

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
    rating: placeDetails.rating || undefined
  };
}