// Central place for all outbound links surfaced in the About screen and
// elsewhere. These are PLACEHOLDER URLs — swap them for the real destinations
// when they exist. Keeping them in one file means we never hardcode a URL inside
// a component.

import Constants from 'expo-constants';

export const EXTERNAL_LINKS = {
  privacyPolicy: 'https://example.com/bean/privacy',
  termsOfService: 'https://example.com/bean/terms',
  // App Store review deep link — replace <APP_ID> with the real id once published.
  appStoreReview: 'https://apps.apple.com/app/id000000000?action=write-review',
  instagram: 'https://instagram.com/bean.app',
  tiktok: 'https://tiktok.com/@bean.app',
  feedback: 'https://example.com/bean/feedback',
} as const;


// Store listings used as the fallback when a shared review link is opened on a
// device without the app. TODO: replace once Bean is published — the App Store
// id is still a placeholder.
export const STORE_LINKS = {
  ios: 'https://apps.apple.com/app/id000000000',
  android: 'https://play.google.com/store/apps/details?id=nz.co.beanapp.app',
} as const;

/**
 * Public, shareable URL for a single review.
 *
 * Points at the `review-link` Supabase Edge Function rather than a `beanapp://`
 * scheme URL on purpose: a custom-scheme link does nothing at all on a device
 * without the app installed, whereas this https URL opens in a browser and
 * redirects — into the app if it's installed, to the store if it isn't.
 */
export function reviewLinkUrl(reviewId: string): string {
  const base =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    (Constants.expoConfig?.extra as { supabaseUrl?: string } | undefined)?.supabaseUrl ||
    '';
  return `${base.replace(/\/+$/, '')}/functions/v1/review-link/${reviewId}`;
}
