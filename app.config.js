// Dynamic Expo config. Merges with `app.json` and injects native config
// values (like the Android Google Maps API key) from environment variables so
// we never commit secrets to source control.
//
// Only `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` may be embedded in the bundle. The
// Places-capable key must never ship in the app — Places calls happen
// server-side in the Supabase Edge Functions.
module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!googleMapsApiKey) {
    console.warn(
      'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not set - the Android map will not load.'
    );
  }

  // The reversed iOS OAuth client id (e.g. com.googleusercontent.apps.123-abc),
  // required by the native Google Sign-In plugin for the iOS URL scheme.
  const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;

  const plugins = [
    ...(config.plugins || []),
    ...(googleIosUrlScheme
      ? [['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }]]
      : ['@react-native-google-signin/google-signin']),
  ];

  // Instagram refuses a story share without a registered Facebook app id. It is
  // not a secret (it ships in every Instagram-sharing app), but it differs per
  // environment, so it comes from the env rather than app.json.
  const facebookAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
  if (!facebookAppId) {
    console.warn(
      'EXPO_PUBLIC_FACEBOOK_APP_ID is not set - sharing to Instagram Stories will be disabled.'
    );
  }

  return {
    ...config,
    plugins,
    extra: {
      ...config.extra,
      ...(facebookAppId ? { facebookAppId } : {}),
    },
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
