// Public landing page for a shared profile link. Same approach as review-link.
//
// A `beanapp://` scheme URL is useless to anyone who doesn't already have the
// app — tapping it simply does nothing. So the app copies an https URL pointing
// here instead, and this function serves a tiny HTML page that tries the scheme
// and falls back to the store.
//
// Deploy with `--no-verify-jwt`: recipients are anonymous by definition, and
// profiles are only readable by the service role from here.
//
//   supabase functions deploy profile-link --no-verify-jwt

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// TODO: swap the iOS id once Bean is published — it is still a placeholder.
const APP_STORE_URL = 'https://apps.apple.com/app/id000000000';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=nz.co.beanapp.app';

/** How long to wait for the scheme handler before giving up on the app. */
const FALLBACK_DELAY_MS = 1500;

interface ProfilePreview {
  username: string;
  photo: string | null;
  bio: string;
}

// Profile ids are auth uuids; anything else is rejected before touching the DB.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function loadPreview(userId: string): Promise<ProfilePreview | null> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase
    .from('profiles')
    .select('username, profile_image_url, bio')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data || !data.username || String(data.username).startsWith('temp_')) {
    return null;
  }
  return {
    username: data.username,
    photo: data.profile_image_url ?? null,
    bio: data.bio ?? '',
  };
}

function page(userId: string, preview: ProfilePreview | null): string {
  const deepLink = `beanapp://user/${userId}`;
  const title = preview ? `@${preview.username} on Bean` : 'A profile on Bean';
  const description = preview?.bio
    ? preview.bio.slice(0, 160)
    : 'See their cafe reviews in the Bean app.';

  // See review-link for why the store redirect is chosen client-side and
  // cancelled on pagehide.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="profile">
${preview?.photo ? `<meta property="og:image" content="${escapeHtml(preview.photo)}">` : ''}
<meta name="twitter:card" content="summary">
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0; min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 12px; padding: 24px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #FFFEFB; color: #0F1312; text-align: center;
  }
  h1 { font-size: 20px; margin: 0; }
  p { margin: 0; color: #474747; font-size: 15px; }
  a {
    margin-top: 12px; padding: 14px 22px; border-radius: 8px;
    background: #0F1312; color: #FFFEFB; text-decoration: none; font-weight: 700;
  }
</style>
</head>
<body>
  <h1>${escapeHtml(preview ? `@${preview.username}` : 'Bean')}</h1>
  <p>Opening this profile in Bean&hellip;</p>
  <a id="store" href="${PLAY_STORE_URL}">Get the app</a>
<script>
  (function () {
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    var store = isIOS ? ${JSON.stringify(APP_STORE_URL)} : ${JSON.stringify(PLAY_STORE_URL)};
    document.getElementById('store').href = store;

    var timer = setTimeout(function () { window.location.replace(store); }, ${FALLBACK_DELAY_MS});
    // If the app opened, this page is backgrounded — cancel the store redirect.
    window.addEventListener('pagehide', function () { clearTimeout(timer); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clearTimeout(timer);
    });

    window.location.replace(${JSON.stringify(deepLink)});
  })();
</script>
</body>
</html>`;
}

serve(async (req) => {
  const url = new URL(req.url);
  // Path is /profile-link/<id> when deployed, so take the trailing segment.
  const userId = url.pathname.split('/').filter(Boolean).pop() ?? '';

  if (!UUID_RE.test(userId)) {
    return new Response('Missing or invalid profile id', { status: 400 });
  }

  // A preview failure only costs us the OG tags, never the redirect itself.
  let preview: ProfilePreview | null = null;
  try {
    preview = await loadPreview(userId);
  } catch {
    preview = null;
  }

  return new Response(page(userId, preview), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
});
