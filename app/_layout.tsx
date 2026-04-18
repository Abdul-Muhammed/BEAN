import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
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
import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import config from '@/gluestack-ui.config';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

// Global error capture for debugging production issues
const errorLog: string[] = [];

function captureError(prefix: string, error: any) {
  const msg = `[${prefix}] ${error?.message || error?.toString() || 'Unknown error'}`;
  errorLog.push(`${new Date().toISOString()}: ${msg}`);
  // Keep log size manageable
  if (errorLog.length > 50) errorLog.shift();
}

// Capture unhandled promise rejections
const originalHandler = (globalThis as any).ErrorUtils?.getGlobalHandler?.();
(globalThis as any).ErrorUtils?.setGlobalHandler?.((error: any, isFatal: boolean) => {
  captureError(isFatal ? 'FATAL' : 'ERROR', error);
  originalHandler?.(error, isFatal);
});

// Also capture promise rejections
if (typeof globalThis !== 'undefined') {
  const orig = (globalThis as any).onunhandledrejection;
  (globalThis as any).onunhandledrejection = (event: any) => {
    captureError('PROMISE', event?.reason || event);
    orig?.(event);
  };
}

// Export error log so it can be accessed from other screens if needed
export function getErrorLog(): string[] {
  return errorLog;
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

  if (!publishableKey) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEFEFE', padding: 20 }}>
        <Text style={{ color: '#D32F2F', fontSize: 16, textAlign: 'center' }}>
          Missing Clerk Publishable Key. Environment variables may not be configured for this build.
        </Text>
      </View>
    );
  }

  // No more ClerkLoadedGuard -- let the app render immediately.
  // Clerk will load in the background. Screens that need auth
  // already check isLoaded/isSignedIn and handle loading states.
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
          <GluestackUIProvider config={config}>
            <ReviewProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(onboarding)" options={{ headerShown: false, gestureEnabled: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </ReviewProvider>
          </GluestackUIProvider>
        </ClerkProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
