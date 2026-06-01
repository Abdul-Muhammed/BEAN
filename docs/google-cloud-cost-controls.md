# Google Cloud cost controls (manual setup)

These are one-time console actions that bound and protect Google API spend. They
complement the code changes (Supabase-as-source-of-truth + cached photos) by
making a runaway bill *impossible* even if something regresses or a key leaks.

Do these in the [Google Cloud Console](https://console.cloud.google.com/) for the
project that owns the Bean Maps/Places API key.

## 1. Set a billing budget + alerts

1. Billing -> Budgets & alerts -> Create budget.
2. Scope it to this project.
3. Set the amount low (we are a small testing app), e.g. **NZD 15/month**.
4. Add alert thresholds at **50% / 90% / 100%** (~NZD 7.50 / 13.50 / 15).
5. Add your email under "Manage notifications".

Budgets alert you but do not stop spend on their own. The quota caps below are the
hard stop.

## 2. Cap each API's daily quota (the hard stop)

APIs & Services -> for each API below -> Quotas & System Limits -> set
"Requests per day" to a safe ceiling. Pick numbers that comfortably cover real
testing but block abuse. Suggested starting caps for a 3-10 tester app:

| API | Suggested requests/day cap |
| --- | --- |
| Places API - Text Search | 500 |
| Places API - Nearby Search | 500 |
| Places API - Place Details | 500 |
| Places API - Place Photos | 1000 |
| Geocoding API | 200 |
| Maps SDK for Android (map loads) | 2000 |

With the new architecture these numbers should rarely be approached, because most
reads now come from Supabase, not Google. Raise them later if you ever hit a cap
legitimately.

## 3. Restrict the API key

APIs & Services -> Credentials -> open the Maps/Places key.

- **Application restriction:** Android apps. Add the package name
  `nz.co.beanapp.app` and the SHA-1 fingerprint of the signing certificate
  (get it from EAS: `eas credentials`, or from the Play Console app signing
  page).
- **API restriction:** restrict the key to *only* the APIs actually used by the
  client after this change. After the migration the client only needs
  **Maps SDK for Android**. The Places/Geocoding calls now happen server-side
  in the Supabase Edge Functions using the separate `GOOGLE_PLACES_API_KEY`
  secret (set in the Supabase dashboard, never shipped in the app bundle).

## 4. Separate keys for client vs server

- **Client key** (`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`): restricted to Android app +
  Maps SDK for Android only. Ships in the bundle, so it must be locked down.
- **Server key** (`GOOGLE_PLACES_API_KEY`): set only as a Supabase Edge Function
  secret. Restrict it to the Places + Geocoding APIs. It never ships to clients.

## 5. Delete the old standalone Places key

Once the app is rebuilt and verified to no longer call Google Places directly
(see `services/googlePlaces.ts` - all calls go through Supabase), delete the old
`EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` from the client environment / EAS secrets so
no Places-capable key is ever shipped in the bundle again.

## 6. Verify after deploy

- Cloud Console -> APIs & Services -> Metrics: confirm Places Text/Nearby/Details
  and Photo request counts drop sharply and flatten as the Supabase cache fills.
- Billing -> Reports: filter by SKU to confirm which API (if any) still costs
  money. If Maps SDK for Android is the only remaining material cost, consider
  the deferred Mapbox-on-Android option.
