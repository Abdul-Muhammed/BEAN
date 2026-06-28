import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Lato_400Regular,
  Lato_700Bold,
  Lato_300Light,
} from '@expo-google-fonts/lato';
import {
  OtomanopeeOne_400Regular,
} from '@expo-google-fonts/otomanopee-one';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ReviewProvider } from '@/context/ReviewContext';
import { FollowProvider } from '@/context/FollowContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { UserProfileProvider, useUserProfile } from '@/hooks/useUserProfile';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import config from '@/gluestack-ui.config';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Global error capture for debugging production issues
const errorLog: string[] = [];

// A stale/revoked refresh token (e.g. left over from the Supabase Auth cutover)
// makes the client's background auto-refresh fail on startup. The session is
// already cleared in AuthContext, so this surfaces as a harmless, un-awaited
// rejection. Treat it as noise: skip logging it AND don't pass it to the
// default handler that would render it as a red ERROR. Genuine auth failures
// (any other message) still flow through normally.
function isBenignRefreshTokenError(error: any): boolean {
  const raw = error?.message || error?.toString() || '';
  return raw.includes('Refresh Token Not Found') || raw.includes('Invalid Refresh Token');
}

function captureError(prefix: string, error: any) {
  const msg = `[${prefix}] ${error?.message || error?.toString() || 'Unknown error'}`;
  errorLog.push(`${new Date().toISOString()}: ${msg}`);
  // Keep log size manageable
  if (errorLog.length > 50) errorLog.shift();
}

// Capture unhandled promise rejections
const originalHandler = (globalThis as any).ErrorUtils?.getGlobalHandler?.();
(globalThis as any).ErrorUtils?.setGlobalHandler?.((error: any, isFatal: boolean) => {
  if (isBenignRefreshTokenError(error)) return;
  captureError(isFatal ? 'FATAL' : 'ERROR', error);
  originalHandler?.(error, isFatal);
});

// Also capture promise rejections
if (typeof globalThis !== 'undefined') {
  const orig = (globalThis as any).onunhandledrejection;
  (globalThis as any).onunhandledrejection = (event: any) => {
    const reason = event?.reason || event;
    if (isBenignRefreshTokenError(reason)) return;
    captureError('PROMISE', reason);
    orig?.(event);
  };
}

// Export error log so it can be accessed from other screens if needed
export function getErrorLog(): string[] {
  return errorLog;
}

// Allow other screens to record diagnostic messages into the same log that
// the long-press debug modal reads.
export function logError(prefix: string, error: any) {
  captureError(prefix, error);
}

/**
 * Reactive auth guard. Drives navigation from auth + onboarding state so that
 * no screen has to redirect manually. This is what keeps a signed-out user from
 * swiping back into authenticated screens: the moment the session flips to null,
 * any (tabs)/(onboarding) screen is replaced with the sign-in screen.
 */
function AuthGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const group = segments[0];
    const inAuth = group === '(auth)';
    const inTabs = group === '(tabs)';
    const inOnboarding = group === '(onboarding)';
    // The add-review screen (and the cafe picker it opens) is part of the
    // onboarding "review 3 cafes" step even though it lives outside the
    // (onboarding) group. Allow a not-yet-onboarded user to visit it so the
    // guard below doesn't bounce them mid-review.
    const inReviewFlow =
      (group === '(tabs)' && segments[1] === 'add-review') ||
      group === 'search-cafes';

    if (!isSignedIn) {
      // Welcome screen (root index) and the (auth) group are valid signed-out
      // destinations. Anything else means a stale authenticated stack — bounce.
      if (inTabs || inOnboarding) {
        router.replace('/(auth)/sign-in');
      }
      return;
    }

    // Signed in: wait until we know the onboarding state before routing.
    if (profileLoading) return;

    const onboarded = profile?.onboarding_completed === true;

    // A missing profile is treated as an existing user (matches index.tsx
    // fallback) and sent into the app rather than back through onboarding.
    if (onboarded || !profile) {
      if (inAuth) router.replace('/(tabs)/home');
    } else if (!inOnboarding && !inReviewFlow) {
      router.replace('/(onboarding)/username');
    }
  }, [isLoaded, isSignedIn, profile, profileLoading, segments, router]);

  return null;
}

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Lato-Regular': Lato_400Regular,
    'Lato-Bold': Lato_700Bold,
    'Lato-Light': Lato_300Light,
    'OtomanopeeOne-Regular': OtomanopeeOne_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  // Render immediately; the AuthProvider resolves the persisted session in the
  // background and screens already check isLoaded/isSignedIn.
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <UserProfileProvider>
            <GluestackUIProvider config={config}>
              <ToastProvider>
                <FollowProvider>
                <ReviewProvider>
                  <AuthGate />
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(auth)" options={{ headerShown: false, gestureEnabled: false }} />
                    <Stack.Screen name="(onboarding)" options={{ headerShown: false, gestureEnabled: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false, animation: 'slide_from_bottom' }} />
                    <Stack.Screen name="settings" options={{ headerShown: false }} />
                    <Stack.Screen name="+not-found" />
                  </Stack>
                  <StatusBar style="auto" />
                </ReviewProvider>
                </FollowProvider>
              </ToastProvider>
            </GluestackUIProvider>
          </UserProfileProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
