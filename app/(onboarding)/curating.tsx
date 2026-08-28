import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import OnboardingLoadingAnimation from '../../components/OnboardingLoadingAnimation';
import { useUserProfile } from '../../hooks/useUserProfile';
import { updateProfile } from '../../lib/profile';
import { colors } from '@/constants/theme';

/**
 * Terminal onboarding step. Everything the user entered has travelled this far
 * as params; this screen performs the single profile write that completes
 * onboarding, using the loading animation to cover the request rather than
 * parking the user on a button spinner.
 *
 * The animation loops until the write resolves and always plays at least one
 * full cycle, so a fast write never flashes the screen and a slow one never
 * looks frozen.
 */
export default function CuratingScreen() {
  const router = useRouter();
  const { refetch: refetchProfile } = useUserProfile();
  const { username, preferences } = useLocalSearchParams<{
    username?: string;
    preferences?: string;
  }>();

  const [error, setError] = useState<string | null>(null);

  // Written from both the animation callback and the write's completion; the
  // navigation only happens once both are true.
  const writeDoneRef = useRef(false);
  const cycleDoneRef = useRef(false);
  const navigatedRef = useRef(false);

  const finishIfReady = useCallback(() => {
    if (navigatedRef.current) return;
    if (!writeDoneRef.current || !cycleDoneRef.current) return;
    navigatedRef.current = true;
    router.replace('/(tabs)/home');
  }, [router]);

  const runWrite = useCallback(async () => {
    setError(null);
    writeDoneRef.current = false;

    const trimmedUsername = (username ?? '').trim();
    if (!trimmedUsername || trimmedUsername.length < 4) {
      setError('Your username needs to be at least 4 characters.');
      return;
    }

    try {
      // Location is no longer collected here — it is requested in context on
      // the first Home visit and written by the LocationProvider.
      await updateProfile({
        username: trimmedUsername,
        preferences: (preferences ?? '').split(',').filter(Boolean),
        onboardingCompleted: true,
      });

      // Refresh the shared profile so the AuthGate guard sees
      // onboarding_completed: true before we land on Home — otherwise its stale
      // copy would bounce us back to the username screen.
      await refetchProfile();

      writeDoneRef.current = true;
      finishIfReady();
    } catch (err) {
      console.error('Onboarding error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'There was an error setting up your profile. Please try again.'
      );
    }
  }, [username, preferences, refetchProfile, finishIfReady]);

  useEffect(() => {
    runWrite();
    // Deliberately once on mount; Retry re-invokes it explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The write is irreversible and there is nothing behind this screen, so
  // swallow Android's hardware back rather than letting it unwind the stack.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const handleCycleComplete = useCallback(() => {
    cycleDoneRef.current = true;
    finishIfReady();
  }, [finishIfReady]);

  const handleRetry = useCallback(() => {
    cycleDoneRef.current = false;
    runWrite();
  }, [runWrite]);

  const handleGoBack = useCallback(() => {
    // Hand every collected value back so nothing the user typed is lost.
    router.replace({
      pathname: '/(onboarding)/username',
      params: {
        username: username ?? '',
        preferences: preferences ?? '',
      },
    });
  }, [router, username, preferences]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.content}>
        <OnboardingLoadingAnimation
          loop={!error}
          onCycleComplete={handleCycleComplete}
        />

        {error ? (
          <View style={styles.textBlock}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>{error}</Text>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleGoBack} hitSlop={8}>
                <Text style={styles.backLink}>Go back</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.textBlock}>
            <Text style={styles.title}>Curating Your Recommendations...</Text>
            <Text style={styles.subtitle}>Hang on!</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  // A sibling of the fixed-size animation box, so the copy cannot move while
  // the logo fills.
  textBlock: {
    marginTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontFamily: 'OtomanopeeOne-Regular',
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: colors.mutedText,
    textAlign: 'center',
  },
  actions: {
    marginTop: 24,
    alignItems: 'center',
    gap: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: colors.surface,
  },
  backLink: {
    fontSize: 15,
    fontFamily: 'Lato-Regular',
    color: colors.mutedText,
    textDecorationLine: 'underline',
  },
});
