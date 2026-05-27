// Dynamic Expo config. Merges with `app.json` and injects native config
// values (like the Android Google Maps API key) from environment variables so
// we never commit secrets to source control.
//
// Prefer `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` if set; otherwise fall back to
// `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` (same Google Cloud project).
module.exports = ({ config }) => {
  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...(config.android && config.android.config),
        ...(googleMapsApiKey
          ? { googleMaps: { apiKey: googleMapsApiKey } }
          : {}),
      },
    },
  };
};
