// Edge Function: delete-account
//
// Permanently deletes the calling user's account. Deleting an auth user requires
// the service-role key (admin API), which must never live on the client — hence
// this function. It:
//   1. Identifies the caller from their Authorization bearer token.
//   2. Purges their rows from reviews / bookmarks / favorites / profiles.
//   3. Deletes the auth user itself via the admin API.
//
// The client (lib/profile.ts -> deleteAccount) forwards the user's access token
// automatically; after this returns the client signs out to clear the now-dead
// session.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Server is misconfigured' }, 500);
  }

  // Identify the caller from their bearer token.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return jsonResponse({ error: 'Missing authorization' }, 401);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    return jsonResponse({ error: 'Invalid or expired session' }, 401);
  }

  const userId = userData.user.id;

  // Purge user-owned data. user_id columns are stored as text (see migrations),
  // so compare against the string uid.
  const tables = ['reviews', 'bookmarks', 'favorites'] as const;
  for (const table of tables) {
    const { error } = await admin.from(table).delete().eq('user_id', userId);
    if (error) {
      return jsonResponse({ error: `Failed to delete ${table}: ${error.message}` }, 500);
    }
  }

  const { error: profileError } = await admin.from('profiles').delete().eq('id', userId);
  if (profileError) {
    return jsonResponse({ error: `Failed to delete profile: ${profileError.message}` }, 500);
  }

  // Finally remove the auth user. Done last so a mid-way failure still leaves a
  // recoverable account rather than orphaned data under a deleted user.
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return jsonResponse({ error: `Failed to delete user: ${deleteError.message}` }, 500);
  }

  return jsonResponse({ success: true });
});
