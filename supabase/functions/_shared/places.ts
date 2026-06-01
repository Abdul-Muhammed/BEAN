// Shared helpers for the Google Places Edge Functions.
//
// These functions own the server-side Google key and treat Supabase as the
// source of truth: Google is only called on a cache miss, and every result is
// persisted (cafes row + cached photo in Storage) so the next request is free.

import {
  createClient,
  SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2.81.1';

export const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
export const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

export const PHOTO_BUCKET = 'cafe-photos';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

export function createServiceClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase function environment');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Minimal place shape the client consumes (matches convertPlaceToCafe input).
export interface PlaceLike {
  place_id: string;
  name: string | null;
  formatted_address: string | null;
  rating: number | null;
  types: string[] | null;
  geometry: { location: { lat: number | null; lng: number | null } };
  thumbnail_url: string | null;
}

// Detailed shape the client consumes (matches getPlaceDetails / enrich input).
export interface DetailsLike {
  place_id: string;
  name: string | null;
  formatted_address: string | null;
  formatted_phone_number: string | null;
  opening_hours: unknown | null;
  rating: number | null;
  types: string[] | null;
  geometry: { location: { lat: number | null; lng: number | null } };
  photos: string[];
}

function coord(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

// New Zealand bounding box (mainland + main islands). Used as a hard scope so
// no result outside NZ is ever cached or returned, regardless of what Google
// hands back. Longitudes that wrap past 180 (e.g. Chatham Islands) are covered
// by the address fallback below.
const NZ_BOUNDS = {
  minLat: -47.5,
  maxLat: -33.8,
  minLng: 166.0,
  maxLng: 179.5,
};

function looksLikeNzAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  return /new zealand|,\s*nz\b|\bnz$/i.test(address.trim());
}

// Returns true when a place is within New Zealand. Prefers geometry (most
// reliable); falls back to the formatted address text when coordinates are
// missing.
export function isNzPlace(place: {
  geometry?: { location?: { lat?: number | null; lng?: number | null } } | null;
  latitude?: number | null;
  longitude?: number | null;
  formatted_address?: string | null;
  vicinity?: string | null;
}): boolean {
  const lat = coord(place?.geometry?.location?.lat ?? place?.latitude);
  const lng = coord(place?.geometry?.location?.lng ?? place?.longitude);

  if (lat !== null && lng !== null) {
    return (
      lat >= NZ_BOUNDS.minLat &&
      lat <= NZ_BOUNDS.maxLat &&
      lng >= NZ_BOUNDS.minLng &&
      lng <= NZ_BOUNDS.maxLng
    );
  }

  return looksLikeNzAddress(place?.formatted_address ?? place?.vicinity ?? null);
}

// Download a single Google Place Photo once and store it in Supabase Storage,
// returning a permanent public URL. Reuses an already-cached photo if present
// so Google is billed at most once per (place_id, position).
export async function cachePhoto(
  supabase: SupabaseClient,
  placeId: string,
  photoReference: string | undefined | null,
  position: number,
  maxWidth = 800
): Promise<string | null> {
  if (!placeId || !photoReference) return null;

  const { data: existing } = await supabase
    .from('cafe_photos')
    .select('public_url')
    .eq('place_id', placeId)
    .eq('position', position)
    .maybeSingle();

  if (existing?.public_url) return existing.public_url;

  if (!GOOGLE_PLACES_API_KEY) return null;

  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}` +
      `&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength === 0) return null;

    const storagePath = `${placeId}/${position}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(storagePath, bytes, { contentType, upsert: true });

    if (uploadError) {
      console.warn('Photo upload failed:', uploadError.message);
      return null;
    }

    const { data: pub } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(storagePath);
    const publicUrl = pub?.publicUrl ?? null;
    if (!publicUrl) return null;

    const { error: insertError } = await supabase.from('cafe_photos').upsert(
      {
        place_id: placeId,
        photo_reference: photoReference,
        storage_path: storagePath,
        public_url: publicUrl,
        width: maxWidth,
        position,
      },
      { onConflict: 'place_id,position' }
    );
    if (insertError) {
      console.warn('cafe_photos upsert failed:', insertError.message);
    }

    return publicUrl;
  } catch (error) {
    console.warn(
      'cachePhoto error:',
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

// Upsert a Google Places "basic" result (from Nearby/Text Search) into `cafes`
// and cache its thumbnail. Returns the thumbnail public URL (or null).
export async function upsertCafeFromPlace(
  supabase: SupabaseClient,
  place: Record<string, any>,
  cacheThumb = true
): Promise<string | null> {
  const placeId: string | undefined = place.place_id || place.id;
  if (!placeId) return null;

  const lat = coord(place?.geometry?.location?.lat);
  const lng = coord(place?.geometry?.location?.lng);

  let thumbnailUrl: string | null = null;
  if (cacheThumb && Array.isArray(place.photos) && place.photos[0]?.photo_reference) {
    thumbnailUrl = await cachePhoto(supabase, placeId, place.photos[0].photo_reference, 0, 800);
  }

  const row: Record<string, unknown> = {
    place_id: placeId,
    name: place.name ?? null,
    formatted_address: place.formatted_address || place.vicinity || null,
    rating: typeof place.rating === 'number' ? place.rating : null,
    latitude: lat,
    longitude: lng,
    types: Array.isArray(place.types) ? place.types : null,
    updated_at: new Date().toISOString(),
  };
  if (thumbnailUrl) row.thumbnail_url = thumbnailUrl;

  const { error } = await supabase.from('cafes').upsert(row, { onConflict: 'place_id' });
  if (error) {
    console.warn('cafes upsert failed:', error.message);
  }

  return thumbnailUrl;
}

// Build the client-facing place shape from a Google result + cached thumbnail.
export function googlePlaceToPlaceLike(
  place: Record<string, any>,
  thumbnailUrl: string | null
): PlaceLike {
  return {
    place_id: place.place_id || place.id,
    name: place.name ?? null,
    formatted_address: place.formatted_address || place.vicinity || null,
    rating: typeof place.rating === 'number' ? place.rating : null,
    types: Array.isArray(place.types) ? place.types : null,
    geometry: {
      location: {
        lat: coord(place?.geometry?.location?.lat),
        lng: coord(place?.geometry?.location?.lng),
      },
    },
    thumbnail_url: thumbnailUrl,
  };
}

// Build the client-facing place shape from a stored cafes row.
export function cafeRowToPlaceLike(row: Record<string, any>): PlaceLike {
  return {
    place_id: row.place_id,
    name: row.name ?? null,
    formatted_address: row.formatted_address ?? null,
    rating: typeof row.rating === 'number' ? row.rating : row.rating ?? null,
    types: Array.isArray(row.types) ? row.types : null,
    geometry: {
      location: {
        lat: coord(row.latitude),
        lng: coord(row.longitude),
      },
    },
    thumbnail_url: row.thumbnail_url ?? null,
  };
}
