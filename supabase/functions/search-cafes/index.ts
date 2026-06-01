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
const RESULT_LIMIT = 20;
// If the DB already matches this many cafes, answer from the DB and skip Google.
const MIN_DB_RESULTS = 5;
// Cap how many fresh results we cache thumbnails for. Mirrors the map's
// `nearby-cafes` behavior so search results show real photos without an
// unbounded number of Google Photo calls per query.
const MAX_THUMBNAILS = 8;

interface SearchRequest {
  query: string;
}

function parseRequest(input: Partial<SearchRequest>): SearchRequest {
  const query = typeof input.query === 'string' ? input.query.trim() : '';
  if (query.length < 2) {
    throw new Error('query must be at least 2 characters');
  }
  return { query };
}

function normalizeKey(query: string): string {
  return query.toLowerCase().replace(/\s+/g, ' ').trim();
}

// Escape characters that have meaning inside a PostgREST `ilike` filter value.
function escapeLike(value: string): string {
  return value.replace(/[%,]/g, ' ').trim();
}

async function fetchGoogleTextSearch(query: string): Promise<Record<string, any>[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Missing GOOGLE_PLACES_API_KEY function secret');
  }
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      query + ' cafe coffee New Zealand'
    )}&region=nz&key=${GOOGLE_PLACES_API_KEY}`
  );
  const data = await res.json();

  if (data.status === 'OVER_QUERY_LIMIT') {
    throw new Error('Google Places API quota exceeded');
  }
  if (data.status === 'REQUEST_DENIED') {
    throw new Error(
      `Google Places Text Search denied the request: ${data.error_message || 'no error_message'}`
    );
  }
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places API error: ${data.status} ${data.error_message || ''}`.trim());
  }
  return Array.isArray(data.results) ? data.results : [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { query } = parseRequest(await req.json());
    const queryKey = normalizeKey(query);
    const supabase = createServiceClient();

    // 1. Text-search cache: a previously-resolved query maps to place_ids.
    const { data: cacheRow } = await supabase
      .from('text_search_cache')
      .select('place_ids, expires_at')
      .eq('query_key', queryKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cacheRow?.place_ids?.length) {
      const { data: rows } = await supabase
        .from('cafes')
        .select('*')
        .in('place_id', cacheRow.place_ids);
      const byId = new Map((rows ?? []).map((r: Record<string, any>) => [r.place_id, r]));
      const ordered: PlaceLike[] = (cacheRow.place_ids as string[])
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((row) => cafeRowToPlaceLike(row as Record<string, any>))
        .filter((place) => isNzPlace(place));
      if (ordered.length > 0) {
        return jsonResponse({ results: ordered, cache: 'hit' });
      }
    }

    // 2. DB trigram/ILIKE search over known cafes.
    const term = escapeLike(query);
    if (term.length >= 2) {
      const { data: dbRows, error: dbError } = await supabase
        .from('cafes')
        .select('*')
        .or(`name.ilike.%${term}%,formatted_address.ilike.%${term}%`)
        .limit(RESULT_LIMIT);
      if (dbError) {
        console.warn('cafes text search failed:', dbError.message);
      }
      const nzDbRows = Array.isArray(dbRows)
        ? dbRows.filter((row: Record<string, any>) => isNzPlace(row))
        : [];
      if (nzDbRows.length >= MIN_DB_RESULTS) {
        const results = nzDbRows.map((row: Record<string, any>) => cafeRowToPlaceLike(row));
        await writeSearchCache(supabase, queryKey, results.map((r) => r.place_id));
        return jsonResponse({ results, cache: 'db' });
      }
    }

    // 3. Cache miss: Google Text Search, persist, return.
    const googleResults = (await fetchGoogleTextSearch(query)).filter((place) =>
      isNzPlace(place)
    );
    const results: PlaceLike[] = [];
    for (let i = 0; i < googleResults.length && i < RESULT_LIMIT; i++) {
      const place = googleResults[i];
      // Cache thumbnails for the first few results so search matches the map's
      // behavior and the detail screen shows a real photo immediately. Beyond
      // the cap we skip the download to bound latency and Google Photo spend;
      // those photos are cached lazily by `cafe-details` when opened.
      const thumb = await upsertCafeFromPlace(supabase, place, i < MAX_THUMBNAILS);
      results.push(googlePlaceToPlaceLike(place, thumb));
    }

    await writeSearchCache(supabase, queryKey, results.map((r) => r.place_id));
    return jsonResponse({ results, cache: 'miss' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected search error';
    console.error(message);
    return jsonResponse({ error: message, results: [] }, 400);
  }
});

async function writeSearchCache(
  supabase: ReturnType<typeof createServiceClient>,
  queryKey: string,
  placeIds: string[]
): Promise<void> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);
  const { error } = await supabase.from('text_search_cache').upsert({
    query_key: queryKey,
    place_ids: placeIds,
    expires_at: expiresAt.toISOString(),
  });
  if (error) {
    console.warn('text_search_cache upsert failed:', error.message);
  }
}
