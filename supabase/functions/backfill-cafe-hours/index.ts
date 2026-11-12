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
// Google applies a per-minute rate limit to Place Details. When a call hits it,
// the batch stops and the response says `rateLimited: true` with
// `retryAfterSeconds`; the caller waits that long and calls again. `stalled`
// is reserved for refusals that waiting won't fix (billing, daily quota, key).
//
// Cost: one Place Details request (opening_hours field only, no photos) per
// cafe, roughly US$17-25 per 1,000 before Google's monthly free usage.

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 300;
// Gentle by default so a batch rarely trips the per-minute limit.
const CONCURRENCY = 2;
const RATE_LIMIT_WAIT_SECONDS = 60;
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
    const tally = { saved: 0, none: 0, refused: 0, error: 0 };
    // How often Google answered with each status, plus one example message per
    // non-OK status, so a failing run says why.
    const statuses: Record<string, number> = {};
    const messages: Record<string, string> = {};
    const worker = async () => {
      for (let id = queue.shift(); id; id = queue.shift()) {
        const { result, status, message } = await fetchHoursOnly(supabase, id);
        tally[result] += 1;
        statuses[status] = (statuses[status] ?? 0) + 1;
        if (message && status !== 'OK' && !messages[status]) messages[status] = message;
        // Google is refusing the key/project: every further call would fail
        // the same way, so stop this batch.
        if (result === 'refused') queue.length = 0;
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    // Refused and errored cafes stay unmarked and are retried by the next call.
    // A per-minute rate limit is waited out; any other refusal, or a call that
    // makes no progress at all, stops the loop.
    const processed = tally.saved + tally.none;
    const rateLimited =
      tally.refused > 0 &&
      Object.keys(statuses).every((s) => s !== 'REQUEST_DENIED' && s !== 'OVER_DAILY_LIMIT') &&
      /rate.?limit/i.test(messages.OVER_QUERY_LIMIT ?? '');
    return jsonResponse({
      ...tally,
      googleCalls: tally.saved + tally.none + tally.refused + tally.error,
      remaining: Math.max(missing - processed, 0),
      rateLimited,
      retryAfterSeconds: rateLimited ? RATE_LIMIT_WAIT_SECONDS : 0,
      stalled: (tally.refused > 0 && !rateLimited) || (processed === 0 && tally.error > 0),
      statuses,
      messages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected backfill error';
    console.error(message);
    return jsonResponse({ error: message }, 400);
  }
});
