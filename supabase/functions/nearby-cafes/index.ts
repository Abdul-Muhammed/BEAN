import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const CACHE_TTL_DAYS = 7;
const MAX_PAGES = 2;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface NearbyRequest {
  lat: number;
  lng: number;
  radius?: number;
  maxPages?: number;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function roundedSearchParams(lat: number, lng: number, radius: number, maxPages: number) {
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;
  const roundedRadius = Math.round(radius / 250) * 250;
  const pages = Math.min(Math.max(Math.trunc(maxPages), 1), MAX_PAGES);
  const cacheKey = `${roundedLat},${roundedLng},${roundedRadius},${pages}`;

  return {
    roundedLat,
    roundedLng,
    roundedRadius,
    pages,
    cacheKey,
  };
}

function parseNearbyRequest(input: Partial<NearbyRequest>): NearbyRequest {
  const lat = Number(input.lat);
  const lng = Number(input.lng);
  const radius = Number(input.radius ?? 5000);
  const maxPages = Number(input.maxPages ?? 1);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error('lat must be a number between -90 and 90');
  }

  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new Error('lng must be a number between -180 and 180');
  }

  if (!Number.isFinite(radius) || radius <= 0 || radius > 50000) {
    throw new Error('radius must be a number between 1 and 50000');
  }

  if (!Number.isFinite(maxPages) || maxPages < 1) {
    throw new Error('maxPages must be at least 1');
  }

  return { lat, lng, radius, maxPages };
}

async function fetchGoogleNearby(
  lat: number,
  lng: number,
  radius: number,
  pages: number
): Promise<unknown[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Missing GOOGLE_PLACES_API_KEY function secret');
  }

  const aggregated: unknown[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < pages; page++) {
    const url = pageToken
      ? `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${pageToken}&key=${GOOGLE_PLACES_API_KEY}`
      : `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=cafe&key=${GOOGLE_PLACES_API_KEY}`;

    const placesResponse = await fetch(url);
    const placesData = await placesResponse.json();

    if (placesData.status === 'INVALID_REQUEST' && pageToken) {
      await delay(1800);
      const retryResponse = await fetch(url);
      const retryData = await retryResponse.json();
      if (retryData.status === 'OK' && Array.isArray(retryData.results)) {
        aggregated.push(...retryData.results);
        pageToken = retryData.next_page_token;
        if (!pageToken) break;
        await delay(1800);
        continue;
      }
      break;
    }

    if (placesData.status === 'OVER_QUERY_LIMIT') {
      throw new Error('Google Places API quota exceeded');
    }

    if (placesData.status === 'REQUEST_DENIED') {
      throw new Error(
        `Google Places Nearby Search denied the request: ${
          placesData.error_message || 'no error_message'
        }`
      );
    }

    if (placesData.status !== 'OK' && placesData.status !== 'ZERO_RESULTS') {
      throw new Error(
        `Google Places API error: ${placesData.status} ${
          placesData.error_message || ''
        }`.trim()
      );
    }

    if (Array.isArray(placesData.results)) {
      aggregated.push(...placesData.results);
    }

    pageToken = placesData.next_page_token;
    if (!pageToken) break;

    await delay(1800);
  }

  return aggregated;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Missing Supabase function environment' }, 500);
  }

  try {
    const body = parseNearbyRequest(await req.json());
    const { roundedLat, roundedLng, roundedRadius, pages, cacheKey } =
      roundedSearchParams(body.lat, body.lng, body.radius ?? 5000, body.maxPages ?? 1);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: cached, error: cacheError } = await supabase
      .from('nearby_places_cache')
      .select('results, expires_at')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cacheError) {
      console.warn('Nearby cache lookup failed:', cacheError.message);
    }

    if (cached?.results) {
      return jsonResponse({ results: cached.results, cache: 'hit' });
    }

    const results = await fetchGoogleNearby(body.lat, body.lng, roundedRadius, pages);
    const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);

    const { error: upsertError } = await supabase.from('nearby_places_cache').upsert({
      cache_key: cacheKey,
      center_latitude: roundedLat,
      center_longitude: roundedLng,
      radius_meters: roundedRadius,
      max_pages: pages,
      results,
      expires_at: expiresAt.toISOString(),
    });

    if (upsertError) {
      console.warn('Nearby cache upsert failed:', upsertError.message);
    }

    return jsonResponse({ results, cache: 'miss' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected nearby search error';
    console.error(message);
    return jsonResponse({ error: message, results: [] }, 400);
  }
});
