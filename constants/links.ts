// Central place for all outbound links surfaced in the About screen and
// elsewhere. These are PLACEHOLDER URLs — swap them for the real destinations
// when they exist. Keeping them in one file means we never hardcode a URL inside
// a component.

export const EXTERNAL_LINKS = {
  privacyPolicy: 'https://example.com/bean/privacy',
  termsOfService: 'https://example.com/bean/terms',
  // App Store review deep link — replace <APP_ID> with the real id once published.
  appStoreReview: 'https://apps.apple.com/app/id000000000?action=write-review',
  instagram: 'https://instagram.com/bean.app',
  tiktok: 'https://tiktok.com/@bean.app',
  feedback: 'https://example.com/bean/feedback',
} as const;
