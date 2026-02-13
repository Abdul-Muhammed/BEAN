import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { SvgXml } from 'react-native-svg';
import { Redirect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getErrorLog } from './_layout';

const logoSvg = `<svg width="320" height="93" viewBox="0 0 320 93" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M23.3184 0C35.2763 1.86026e-05 44.5639 1.79347 51.1807 5.38086C57.7974 8.96827 61.1055 14.0707 61.1055 20.6875C61.1054 29.1378 55.3654 35.7145 43.8857 40.418C50.662 42.2515 56.0837 45.3211 60.1494 49.626C64.215 53.9308 66.2471 58.794 66.2471 64.2148C66.247 69.556 64.1747 74.3393 60.0293 78.5645C55.9636 82.7896 50.3033 86.0977 43.0488 88.4893C35.874 90.8809 27.5828 92.0771 18.1758 92.0771C15.7046 92.0771 12.9943 91.9569 10.0449 91.7178C7.09527 91.5583 4.10554 91.2795 1.07617 90.8809C0.996456 89.0473 0.916629 86.1775 0.836914 82.2715C0.757196 78.2856 0.677374 73.6618 0.597656 68.4004C0.517937 63.0592 0.438117 57.3988 0.358398 51.4199C0.27868 45.441 0.198859 39.4219 0.119141 33.3633C0.119141 27.3045 0.0797204 21.5241 0 16.0234V1.55469C4.30475 1.07638 8.41023 0.717678 12.3164 0.478516C16.3024 0.159634 19.9701 0 23.3184 0ZM53.2129 52.6152C39.0228 52.9341 22.979 53.8512 13.0938 54.6484C13.0938 58.9531 13.7718 62.9395 15.127 66.6064C16.4821 70.2732 18.2759 73.223 20.5078 75.4551C22.8196 77.6871 25.4105 78.8036 28.2803 78.8037C31.3892 78.8037 34.4186 77.5678 37.3682 75.0967C40.3974 72.7051 44.1844 62.8798 46.3369 58.8936C48.4894 54.9875 52.6548 57.0795 53.2129 52.6152ZM12.8545 10.7627C13.1055 22.0396 13.5454 31.6061 14.1729 39.4619C17.5608 39.4619 20.6979 38.9236 23.584 37.8467C26.4702 36.7697 28.7911 35.3432 30.5479 33.5693C32.3046 31.7321 33.1836 29.6733 33.1836 27.3926C33.1835 24.9219 32.2105 22.5149 30.2656 20.1709C28.3833 17.7635 25.8735 15.7037 22.7363 13.9932C19.6621 12.2828 16.3679 11.2061 12.8545 10.7627Z" fill="#0F1312"/>
<path d="M141.246 91.4867C138.492 91.2506 134.085 91.0538 128.025 90.8964C122.044 90.6603 114.843 90.5029 106.423 90.4242C98.0805 90.3455 88.9909 90.3062 79.1536 90.3062C78.9962 88.1026 78.7994 84.758 78.5633 80.2722C78.4059 75.7077 78.2092 70.5136 77.9731 64.6899C77.737 58.8663 77.5009 52.8065 77.2648 46.5106C77.0287 40.2148 76.832 34.155 76.6746 28.3314C76.5172 22.429 76.3598 17.1956 76.2024 12.6311C76.1237 8.06657 76.0844 4.6432 76.0844 2.36094C79.5471 2.36094 83.5213 2.36094 88.0071 2.36094C92.5716 2.28225 97.3329 2.20355 102.291 2.12485C107.249 2.04615 112.167 1.96746 117.047 1.88876C121.926 1.73136 126.451 1.61331 130.622 1.53462C134.872 1.37722 138.453 1.25917 141.365 1.18047L141.837 13.8115L99.6938 12.395C99.6938 17.0382 99.6938 21.7601 99.6938 26.5606C99.6938 31.2825 99.7332 35.9257 99.8119 40.4902L139.476 39.1917L139.004 52.1769L99.9299 50.5242C100.009 56.1118 100.087 61.4239 100.166 66.4606C100.245 71.4973 100.363 76.0618 100.52 80.1541L141.719 78.7375L141.246 91.4867Z" fill="#0F1312"/>
<path d="M181.766 72.481C179.72 72.481 177.595 72.481 175.392 72.481C173.267 72.4024 171.063 72.2843 168.781 72.1269C167.05 78.2654 165.318 84.6793 163.587 91.3686L149.421 90.4242C153.828 75.5503 158.747 60.5583 164.177 45.4482C169.607 30.2595 175.392 15.5035 181.53 1.18047C184.442 0.865678 187.669 0.590236 191.21 0.354144C194.83 0.118048 198.529 0 202.306 0C207.107 11.6473 212.222 25.1047 217.653 40.3722C223.083 55.6396 228.67 72.0876 234.415 89.716C229.851 90.5029 225.522 91.0932 221.43 91.4867C217.416 91.8802 213.324 92.0769 209.153 92.0769C207.501 85.4662 205.651 78.5015 203.605 71.1825C196.601 72.0482 189.321 72.481 181.766 72.481ZM186.37 13.8115C184.717 18.2973 182.632 24.5145 180.114 32.463C177.674 40.4115 174.959 49.7373 171.968 60.4402C175.116 60.8337 178.343 61.1092 181.648 61.2666C185.032 61.424 188.652 61.5026 192.509 61.5026C193.925 61.5026 195.342 61.5026 196.758 61.5026C198.253 61.424 199.631 61.3846 200.89 61.3846C199.159 55.0887 197.388 48.9896 195.578 43.0873C193.846 37.1062 192.194 31.6367 190.62 26.6787C189.046 21.642 187.629 17.353 186.37 13.8115Z" fill="#0F1312"/>
<path d="M242.088 90.5423C242.088 87.0009 242.128 82.7118 242.206 77.6751C242.285 72.5597 242.364 67.0902 242.443 61.2666C242.6 55.3642 242.757 49.4225 242.915 43.4414C243.072 37.3816 243.229 31.6367 243.387 26.2065C243.623 20.6976 243.82 15.8577 243.977 11.6867C244.135 7.43698 244.292 4.21036 244.449 2.00681C246.495 1.84941 249.368 1.73136 253.067 1.65266C256.844 1.57396 261.527 1.53462 267.114 1.53462C273.568 11.0571 280.296 21.2092 287.3 31.9908C294.383 42.6938 301.584 54.1444 308.903 66.3426L306.306 1.41657C308.352 1.41657 310.556 1.49527 312.917 1.65266C315.356 1.73136 317.717 1.84941 320 2.00681C320 8.61745 319.96 15.7003 319.882 23.2553C319.803 30.7316 319.724 38.1686 319.645 45.5663C319.567 52.9639 319.449 59.85 319.291 66.2245C319.134 72.5204 318.977 77.8325 318.819 82.1609C318.74 86.4893 318.622 89.3225 318.465 90.6603C316.812 90.739 314.569 90.8177 311.736 90.8964C308.982 90.9751 306.188 91.0145 303.355 91.0145C300.522 91.0932 298.2 91.1325 296.39 91.1325C290.173 80.9805 283.248 70.2775 275.614 59.0237C268.059 47.7698 260.425 36.5947 252.713 25.4982L255.782 91.2506C251.375 91.2506 246.81 91.0145 242.088 90.5423Z" fill="#0F1312"/>
</svg>`;

export default function WelcomeScreen() {
  const { isSignedIn } = useAuth();
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!isLoaded) return;

      if (!isSignedIn || !user) {
        setChecking(false);
        return;
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('clerk_user_id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          // On error, default to home for existing users
          setShouldRedirect('/(tabs)/home');
          setChecking(false);
          return;
        }

        // If profile exists and onboarding is explicitly completed, go to home
        if (profile?.onboarding_completed === true) {
          setShouldRedirect('/(tabs)/home');
        } 
        // If profile exists but onboarding is false or null, go to onboarding
        // (This handles users who started but didn't finish onboarding)
        else if (profile) {
          setShouldRedirect('/(onboarding)/username');
        }
        // If profile doesn't exist, this shouldn't happen for users who completed onboarding
        // But if it does, default to home (they're an existing user who signed in)
        // Profile creation happens during sign-up, so missing profile = edge case
        else {
          setShouldRedirect('/(tabs)/home');
        }
      } catch (error) {
        console.error('Error checking onboarding:', error);
        // On error, default to home for existing users
        setShouldRedirect('/(tabs)/home');
      }

      setChecking(false);
    };

    checkOnboarding();
  }, [isSignedIn, user, isLoaded]);

  if (isSignedIn && checking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, styles.centerContent]}>
          <ActivityIndicator size="large" color="#1C1C1E" />
        </View>
      </SafeAreaView>
    );
  }

  if (shouldRedirect) {
    return <Redirect href={shouldRedirect as any} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FEFEFE" />

      {/* Debug Modal - long press logo to open */}
      <Modal visible={showDebug} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FEFEFE' }}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 4 }}>Debug Info</Text>
            <Text style={{ fontSize: 13, color: '#555', marginBottom: 16 }}>
              Long-pressed logo to open. Clerk isLoaded: {String(isLoaded)}, isSignedIn: {String(isSignedIn)}
            </Text>

            <Text style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 8 }}>Error Log ({debugLogs.length} entries):</Text>
            {debugLogs.length === 0 ? (
              <Text style={{ fontSize: 13, color: '#8E8E93', marginBottom: 16 }}>No errors captured.</Text>
            ) : (
              debugLogs.map((log, i) => (
                <Text key={i} style={{ fontSize: 11, fontFamily: 'monospace', color: '#D32F2F', marginBottom: 4 }}>{log}</Text>
              ))
            )}

            <TouchableOpacity
              style={{ backgroundColor: '#1C1C1E', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20 }}
              onPress={() => setShowDebug(false)}
            >
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FFF' }}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.logoContainer}
          activeOpacity={0.8}
          onLongPress={() => {
            setDebugLogs(getErrorLog());
            setShowDebug(true);
          }}
          delayLongPress={3000}
        >
          <Text style={styles.welcomeText}>Welcome To</Text>
          <SvgXml xml={logoSvg} width={280} height={82} />
        </TouchableOpacity>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.createAccountButton}
            onPress={() => router.push('/(auth)/sign-up')}
          >
            <Text style={styles.createAccountText}>Create An Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/(auth)/sign-in')}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFEFE',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 20,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonsContainer: {
    gap: 16,
  },
  createAccountButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  createAccountText: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#FFFFFF',
  },
  signInButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1C1C1E',
  },
  signInText: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
