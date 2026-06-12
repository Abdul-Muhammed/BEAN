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

  // The reversed iOS OAuth client id (e.g. com.googleusercontent.apps.123-abc),
  // required by the native Google Sign-In plugin for the iOS URL scheme.
  const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;

  const plugins = [
    ...(config.plugins || []),
    ...(googleIosUrlScheme
      ? [['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }]]
      : ['@react-native-google-signin/google-signin']),
  ];

  return {
    ...config,
    plugins,
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
