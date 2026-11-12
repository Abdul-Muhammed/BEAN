import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  corsHeaders,
  createServiceClient,
  fetchHoursOnly,
  jsonResponse,
  SUPABASE_SERVICE_ROLE_KEY,
} from '../_shared/places.ts';

// One-off backfill of cafes.opening_hours for cafes that have never had their
// hours fetched. Admin only: the caller must send the service role key, so the
// app (which only holds the anon key) can never trigger Google spend here.
//
// Each call handles up to `limit` cafes and reports how many are left, so it is
// run in a loop until `remaining` reaches 0. `dryRun: true` only counts.
//
// Cost: one Place Details request (opening_hours field only, no photos) per
// cafe, roughly US$17-25 per 1,000 before Google's monthly free usage.

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 300;
const CONCURRENCY = 5;
const USD_PER_1000 = 20;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!SUPABASE_SERVICE_ROLE_KEY || token !== SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;
    const limit = Math.min(
      Math.max(Math.trunc(Number(body?.limit ?? DEFAULT_LIMIT)) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );

    const supabase = createServiceClient();

    const { count, error: countError } = await supabase
      .from('cafes')
      .select('place_id', { count: 'exact', head: true })
      .is('hours_fetched_at', null);
    if (countError) throw new Error(countError.message);
    const missing = count ?? 0;

    if (dryRun) {
      return jsonResponse({
        dryRun: true,
        missing,
        estimatedUsd: Math.round((missing / 1000) * USD_PER_1000 * 100) / 100,
      });
    }

    const { data, error } = await supabase
      .from('cafes')
      .select('place_id')
      .is('hours_fetched_at', null)
      .order('place_id')
      .limit(limit);
    if (error) throw new Error(error.message);

    const queue = (data ?? []).map((row: { place_id: string }) => row.place_id);
    const tally = { saved: 0, none: 0, error: 0 };
    const worker = async () => {
      for (let id = queue.shift(); id; id = queue.shift()) {
        tally[await fetchHoursOnly(supabase, id)] += 1;
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    // Errors stay unmarked and are retried by the next call; stop looping if a
    // call makes no progress at all (e.g. quota exceeded).
    const processed = tally.saved + tally.none;
    return jsonResponse({
      ...tally,
      googleCalls: tally.saved + tally.none + tally.error,
      remaining: Math.max(missing - processed, 0),
      stalled: processed === 0 && tally.error > 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected backfill error';
    console.error(message);
    return jsonResponse({ error: message }, 400);
  }
});
