import Constants, { ExecutionEnvironment } from 'expo-constants';

// Native Google Sign-In (RNGoogleSignin) ships only in custom dev/production
// builds. Expo Go's prebuilt binary does not contain it, and the package's spec
// throws at import time (TurboModuleRegistry.getEnforcing) when the native module
// is missing. So we detect Expo Go and never load the module there.
export const isGoogleSignInAvailable =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

// Lazily resolve the native module so Expo Go never imports it. Client IDs come
// from the Google Cloud project; the webClientId is the one Supabase validates
// the ID token against.
let configured = false;
function getGoogleSignin() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@react-native-google-signin/google-signin');
  if (!configured) {
    mod.GoogleSignin.configure({
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });
    configured = true;
  }
  return mod;
}

/** Runs the native Google sign-in flow and returns the Google ID token. */
export async function signInWithGoogle(): Promise<string> {
  const { GoogleSignin } = getGoogleSignin();
  await GoogleSignin.hasPlayServices();
  const userInfo = await GoogleSignin.signIn();
  // Support both newer ({ data: { idToken } }) and older ({ idToken }) shapes.
  const idToken = (userInfo as any)?.data?.idToken ?? (userInfo as any)?.idToken;

  if (!idToken) {
    throw new Error('No ID token returned from Google');
  }
  return idToken;
}

/** True when the error represents the user backing out of the sign-in sheet. */
export function isSignInCancelled(err: any): boolean {
  const { statusCodes } = getGoogleSignin();
  return err?.code === statusCodes.SIGN_IN_CANCELLED;
}
