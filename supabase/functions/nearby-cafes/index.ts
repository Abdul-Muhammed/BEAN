import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  cafeRowToPlaceLike,
  corsHeaders,
  createServiceClient,
  GOOGLE_PLACES_API_KEY,
  googlePlaceToPlaceLike,
  isNzPlace,
  jsonResponse,
  PlaceLike,
  upsertCafeFromPlace,
} from '../_shared/places.ts';

const CACHE_TTL_DAYS = 7;
const MAX_PAGES = 2;
// If the DB already knows this many cafes in the viewport, serve from the DB
// and skip Google entirely. Coverage grows as users explore.
const MIN_DB_RESULTS = 8;
// Cap how many results we cache thumbnails for per fresh fetch (bounds latency
// and Google Photo calls on a cold area).
const MAX_THUMBNAILS = 8;

interface NearbyRequest {
  lat?: number;
  lng?: number;
  address?: string;
  radius: number;
  maxPages: number;
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
  return { roundedLat, roundedLng, roundedRadius, pages, cacheKey };
}

function parseNearbyRequest(input: Partial<NearbyRequest>): NearbyRequest {
  const radius = Number(input.radius ?? 5000);
  const maxPages = Number(input.maxPages ?? 1);
  const address = typeof input.address === 'string' ? input.address.trim() : undefined;

  if (!Number.isFinite(radius) || radius <= 0 || radius > 50000) {
    throw new Error('radius must be a number between 1 and 50000');
  }
  if (!Number.isFinite(maxPages) || maxPages < 1) {
    throw new Error('maxPages must be at least 1');
  }

  const hasLat = input.lat !== undefined && input.lat !== null;
  const hasLng = input.lng !== undefined && input.lng !== null;

  if (hasLat || hasLng) {
    const lat = Number(input.lat);
    const lng = Number(input.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new Error('lat must be a number between -90 and 90');
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new Error('lng must be a number between -180 and 180');
    }
    return { lat, lng, radius, maxPages };
  }

  if (address) {
    return { address, radius, maxPages };
  }

  throw new Error('Provide either lat/lng or an address');
}

// Drop a leading street number and de-duplicate tokens so an address geocodes
// more reliably (e.g. "35, Auckland, Auckland" -> "Auckland").
function simplifyAddress(address: string): string | null {
  if (!address) return null;
  const parts = address.split(',').map((p) => p.trim()).filter((p) => p.length > 0);
  if (parts.length === 0) return null;
  const filtered = parts.filter((p, idx) => !(idx === 0 && /^\d+\w?$/.test(p)));
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const part of filtered) {
    const key = part.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(part);
    }
  }
  return deduped.slice(-3).join(', ');
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Missing GOOGLE_PLACES_API_KEY function secret');
  }
  const attempt = async (query: string) => {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}` +
        `&region=nz&components=country:NZ&key=${GOOGLE_PLACES_API_KEY}`
    );
    return res.json();
  };

  let data = await attempt(address);
  if (data.status !== 'OK' || !data.results?.length) {
    const simplified = simplifyAddress(address);
    if (simplified && simplified !== address) {
      data = await attempt(simplified);
    }
  }
  if (data.status !== 'OK' || !data.results?.length) {
    console.warn(`Geocode failed for "${address}" (${data.status})`);
    return null;
  }
  const { lat, lng } = data.results[0].geometry.location;
  return { lat, lng };
}

async function fetchGoogleNearby(
  lat: number,
  lng: number,
  radius: number,
  pages: number
): Promise<Record<string, any>[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Missing GOOGLE_PLACES_API_KEY function secret');
  }

  const aggregated: Record<string, any>[] = [];
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
        `Google Places API error: ${placesData.status} ${placesData.error_message || ''}`.trim()
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

  try {
    const body = parseNearbyRequest(await req.json());
    const supabase = createServiceClient();

    // Resolve coordinates (geocode the address server-side if needed).
    let lat = body.lat;
    let lng = body.lng;
    if ((lat === undefined || lng === undefined) && body.address) {
      const geocoded = await geocodeAddress(body.address);
      if (!geocoded) {
        return jsonResponse({ results: [], cache: 'geocode_failed' });
      }
      lat = geocoded.lat;
      lng = geocoded.lng;
    }
    if (lat === undefined || lng === undefined) {
      return jsonResponse({ error: 'Could not resolve coordinates', results: [] }, 400);
    }

    const { roundedLat, roundedLng, roundedRadius, pages, cacheKey } = roundedSearchParams(
      lat,
      lng,
      body.radius,
      body.maxPages
    );

    // 1. Shared viewport cache (fast path for repeated map areas).
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
      const nzResults = Array.isArray(cached.results)
        ? cached.results.filter((place: Record<string, any>) => isNzPlace(place))
        : [];
      return jsonResponse({ results: nzResults, cache: 'hit' });
    }

    // 2. DB-first: if we already know enough cafes in this viewport, serve them
    //    and skip Google entirely.
    const { data: dbRows, error: dbError } = await supabase.rpc('cafes_nearby', {
      p_lat: lat,
      p_lng: lng,
      p_radius_meters: roundedRadius,
      p_limit: pages * 20,
    });
    if (dbError) {
      console.warn('cafes_nearby RPC failed:', dbError.message);
    }

    const nzDbRows = Array.isArray(dbRows)
      ? dbRows.filter((row: Record<string, any>) => isNzPlace(row))
      : [];
    if (nzDbRows.length >= MIN_DB_RESULTS) {
      const results: PlaceLike[] = nzDbRows.map((row: Record<string, any>) =>
        cafeRowToPlaceLike(row)
      );
      await writeNearbyCache(supabase, {
        cacheKey,
        roundedLat,
        roundedLng,
        roundedRadius,
        pages,
        results,
      });
      return jsonResponse({ results, cache: 'db' });
    }

    // 3. Cache miss: fetch from Google, persist, return.
    const googleResults = (await fetchGoogleNearby(lat, lng, roundedRadius, pages)).filter(
      (place) => isNzPlace(place)
    );

    const results: PlaceLike[] = [];
    for (let i = 0; i < googleResults.length; i++) {
      const place = googleResults[i];
      const thumb = await upsertCafeFromPlace(supabase, place, i < MAX_THUMBNAILS);
      results.push(googlePlaceToPlaceLike(place, thumb));
    }

    await writeNearbyCache(supabase, {
      cacheKey,
      roundedLat,
      roundedLng,
      roundedRadius,
      pages,
      results,
    });

    return jsonResponse({ results, cache: 'miss' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected nearby search error';
    console.error(message);
    return jsonResponse({ error: message, results: [] }, 400);
  }
});

async function writeNearbyCache(
  supabase: ReturnType<typeof createServiceClient>,
  params: {
    cacheKey: string;
    roundedLat: number;
    roundedLng: number;
    roundedRadius: number;
    pages: number;
    results: PlaceLike[];
  }
): Promise<void> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);
  const { error } = await supabase.from('nearby_places_cache').upsert({
    cache_key: params.cacheKey,
    center_latitude: params.roundedLat,
    center_longitude: params.roundedLng,
    radius_meters: params.roundedRadius,
    max_pages: params.pages,
    results: params.results,
    expires_at: expiresAt.toISOString(),
  });
  if (error) {
    console.warn('Nearby cache upsert failed:', error.message);
  }
}
