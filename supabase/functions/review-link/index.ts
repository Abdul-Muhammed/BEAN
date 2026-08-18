// Public landing page for a shared review link.
//
// A `beanapp://` scheme URL is useless to anyone who doesn't already have the
// app — tapping it simply does nothing. So the app copies an https URL pointing
// here instead, and this function serves a tiny HTML page that tries the scheme
// and falls back to the store.
//
// Deploy with `--no-verify-jwt`: recipients are anonymous by definition, and the
// reviews table is only readable by the service role from here.
//
//   supabase functions deploy review-link --no-verify-jwt

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// TODO: swap the iOS id once Bean is published — it is still a placeholder.
const APP_STORE_URL = 'https://apps.apple.com/app/id000000000';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=nz.co.beanapp.app';

/** How long to wait for the scheme handler before giving up on the app. */
const FALLBACK_DELAY_MS = 1500;

interface ReviewPreview {
  cafeName: string;
  rating: number;
  photo: string | null;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function loadPreview(reviewId: string): Promise<ReviewPreview | null> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase
    .from('reviews')
    .select('cafe_name, rating, photos, cafe_image, text')
    .eq('id', reviewId)
    .maybeSingle();

  if (error || !data) return null;

  const photos = Array.isArray(data.photos) ? data.photos.filter(Boolean) : [];
  return {
    cafeName: data.cafe_name ?? 'a cafe',
    rating: typeof data.rating === 'string' ? parseFloat(data.rating) : (data.rating ?? 0),
    photo: photos[0] ?? data.cafe_image ?? null,
    text: data.text ?? '',
  };
}

function page(reviewId: string, preview: ReviewPreview | null): string {
  const deepLink = `beanapp://diary/${reviewId}`;
  const title = preview
    ? `${preview.cafeName} — ${preview.rating.toFixed(1)} on Bean`
    : 'A review on Bean';
  const description = preview?.text
    ? preview.text.slice(0, 160)
    : 'Open this review in the Bean app.';

  // The store redirect is chosen on the client because only the browser knows
  // the platform, and it is deliberately cancelled on `pagehide` — that event
  // fires when the app actually takes over, which stops us from bouncing a
  // successful hand-off to the store on the way back.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="article">
${preview?.photo ? `<meta property="og:image" content="${escapeHtml(preview.photo)}">` : ''}
<meta name="twitter:card" content="${preview?.photo ? 'summary_large_image' : 'summary'}">
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
  <h1>${escapeHtml(preview ? preview.cafeName : 'Bean')}</h1>
  <p>Opening this review in Bean&hellip;</p>
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
  // Path is /review-link/<id> when deployed, so take the trailing segment.
  const reviewId = url.pathname.split('/').filter(Boolean).pop() ?? '';

  if (!reviewId || reviewId === 'review-link') {
    return new Response('Missing review id', { status: 400 });
  }

  // A preview failure only costs us the OG tags, never the redirect itself.
  let preview: ReviewPreview | null = null;
  try {
    preview = await loadPreview(reviewId);
  } catch {
    preview = null;
  }

  return new Response(page(reviewId, preview), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
});
