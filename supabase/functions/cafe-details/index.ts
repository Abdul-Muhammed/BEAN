import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  cachePhoto,
  corsHeaders,
  createServiceClient,
  DetailsLike,
  GOOGLE_PLACES_API_KEY,
  jsonResponse,
} from '../_shared/places.ts';

const DETAILS_TTL_DAYS = 30;
const MAX_DETAIL_PHOTOS = 3;
const PHOTO_WIDTH = 1200;

interface DetailsRequest {
  placeId: string;
}

function parseRequest(input: Partial<DetailsRequest>): DetailsRequest {
  const placeId = typeof input.placeId === 'string' ? input.placeId.trim() : '';
  if (!placeId) {
    throw new Error('placeId is required');
  }
  return { placeId };
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function readStoredPhotos(
  supabase: ReturnType<typeof createServiceClient>,
  placeId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('cafe_photos')
    .select('public_url, position')
    .eq('place_id', placeId)
    .order('position', { ascending: true })
    .limit(MAX_DETAIL_PHOTOS);
  return (data ?? []).map((row: Record<string, any>) => row.public_url).filter(Boolean);
}

async function fetchGoogleDetails(placeId: string): Promise<Record<string, any> | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Missing GOOGLE_PLACES_API_KEY function secret');
  }
  const fields = [
    'place_id',
    'name',
    'formatted_address',
    'formatted_phone_number',
    'opening_hours',
    'photos',
    'rating',
    'types',
    'geometry',
  ].join(',');

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}` +
      `&fields=${fields}&key=${GOOGLE_PLACES_API_KEY}`
  );
  const data = await res.json();

  if (data.status === 'OVER_QUERY_LIMIT') {
    throw new Error('Google Places API quota exceeded');
  }
  if (data.status === 'REQUEST_DENIED') {
    throw new Error(
      `Google Place Details denied the request: ${data.error_message || 'no error_message'}`
    );
  }
  if (data.status !== 'OK') {
    return null;
  }
  return data.result ?? null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { placeId } = parseRequest(await req.json());
    const supabase = createServiceClient();

    // 1. DB-first: return cached details if fresh.
    const { data: row } = await supabase
      .from('cafes')
      .select('*')
      .eq('place_id', placeId)
      .maybeSingle();

    const fresh =
      row?.details_expires_at && new Date(row.details_expires_at).getTime() > Date.now();
    const hasDetails = !!(row?.phone || row?.opening_hours);

    if (row && fresh && hasDetails) {
      const photos = await readStoredPhotos(supabase, placeId);
      // Fall back to the cached thumbnail when no full-size detail photos have
      // been stored yet, so a search-sourced cafe still returns a real image
      // instead of an empty array (which the client treats as "no photo").
      if (photos.length === 0 && row.thumbnail_url) {
        photos.push(row.thumbnail_url);
      }
      const result: DetailsLike = {
        place_id: row.place_id,
        name: row.name ?? null,
        formatted_address: row.formatted_address ?? null,
        formatted_phone_number: row.phone ?? null,
        opening_hours: row.opening_hours ?? null,
        rating: num(row.rating),
        types: Array.isArray(row.types) ? row.types : null,
        geometry: { location: { lat: num(row.latitude), lng: num(row.longitude) } },
        photos,
      };
      return jsonResponse({ result, cache: 'hit' });
    }

    // 2. Cache miss / stale: fetch from Google, persist, cache photos.
    const details = await fetchGoogleDetails(placeId);
    if (!details) {
      return jsonResponse({ result: null, cache: 'miss' });
    }

    const lat = num(details?.geometry?.location?.lat);
    const lng = num(details?.geometry?.location?.lng);

    // Cache up to 3 photos to Storage.
    const photoRefs: string[] = Array.isArray(details.photos)
      ? details.photos
          .slice(0, MAX_DETAIL_PHOTOS)
          .map((p: Record<string, any>) => p?.photo_reference)
          .filter(Boolean)
      : [];

    const photos: string[] = [];
    for (let i = 0; i < photoRefs.length; i++) {
      const url = await cachePhoto(supabase, placeId, photoRefs[i], i, PHOTO_WIDTH);
      if (url) photos.push(url);
    }

    const expiresAt = new Date(Date.now() + DETAILS_TTL_DAYS * 24 * 60 * 60 * 1000);
    const { error: upsertError } = await supabase.from('cafes').upsert(
      {
        place_id: placeId,
        name: details.name ?? null,
        formatted_address: details.formatted_address ?? null,
        rating: typeof details.rating === 'number' ? details.rating : null,
        latitude: lat,
        longitude: lng,
        phone: details.formatted_phone_number ?? null,
        opening_hours: details.opening_hours ?? null,
        types: Array.isArray(details.types) ? details.types : null,
        ...(photos[0] ? { thumbnail_url: photos[0] } : {}),
        details_fetched_at: new Date().toISOString(),
        details_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'place_id' }
    );
    if (upsertError) {
      console.warn('cafes details upsert failed:', upsertError.message);
    }

    const result: DetailsLike = {
      place_id: placeId,
      name: details.name ?? null,
      formatted_address: details.formatted_address ?? null,
      formatted_phone_number: details.formatted_phone_number ?? null,
      opening_hours: details.opening_hours ?? null,
      rating: typeof details.rating === 'number' ? details.rating : null,
      types: Array.isArray(details.types) ? details.types : null,
      geometry: { location: { lat, lng } },
      photos,
    };

    return jsonResponse({ result, cache: 'miss' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected details error';
    console.error(message);
    return jsonResponse({ error: message, result: null }, 400);
  }
});
