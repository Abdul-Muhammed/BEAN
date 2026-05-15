import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSignIn, useOAuth } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import { createOrUpdateProfile } from '../../lib/profile';
import { colors } from '@/constants/theme';

WebBrowser.maybeCompleteAuthSession();

const beanLogoSvg = `<svg width="48" height="81" viewBox="0 0 48 81" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M25.6136 68.523C19.0159 70.9613 11.8444 72.1805 4.09929 72.1805C2.665 54.3953 1.01555 25.5303 0.441833 0C8.47384 1.004 4.70884 8.49815 11.7368 12.3707C18.9083 16.2433 36.5859 23.0561 40.8888 28.5064C45.335 33.8133 47.5582 39.2636 47.5582 44.8573C47.5582 50.0207 45.5502 54.6822 41.5342 58.8416C37.5182 62.8576 32.2113 66.0847 25.6136 68.523Z" fill="#0F1312"/>
<path d="M11.0008 71.0796L11.9031 71.1802L12.1619 71.2085L12.1707 71.4683L12.3641 77.2915L14.9959 78.4204L15.4051 78.5952L15.0906 78.9097L14.3885 79.6108L14.2401 79.7603L14.0496 79.6714L11.4442 78.4614L9.88849 80.2007L9.67657 80.437L8.63361 79.394L8.85529 79.1812L11.0594 77.0728L10.6678 71.3989L10.6434 71.0396L11.0008 71.0796Z" fill="#0F1312" stroke="#0F1312" stroke-width="0.601504"/>
<path d="M23.0832 68.6719L23.0978 68.957L23.3781 74.2012L26.4299 73.3936L26.8693 73.2773L26.8049 73.7266L26.7043 74.4287L26.675 74.6318L26.4758 74.6787L23.3439 75.415L23.7951 77.9424L23.843 78.21L23.5822 78.2842L22.8801 78.4854L22.5432 78.5811L22.4992 78.2334L22.0978 75.0254L22.0969 75.0137L22.0959 75.0029L21.7951 68.9873L21.7795 68.6719H23.0832Z" fill="#0F1312" stroke="#0F1312" stroke-width="0.601504"/>
<path d="M26.4069 9.62402H24.8258L24.8043 9.7998L24.403 13.0078L24.402 13.0156V13.0225L24.1012 19.0381L24.0905 19.248H25.193L25.2037 19.0586L25.5045 13.4443H25.5035L25.693 10.6025L26.235 10.5244L26.4069 10.5V9.62402Z" fill="#0F1312" stroke="#0F1312" stroke-width="0.401002"/>
<path d="M32.6611 8.7085L31.7588 12.2173L31.6787 12.5298L31.3613 12.4761L29.5566 12.1753L29.332 12.1382L29.2754 11.9175L29.1104 11.2778H26.8818L26.8584 10.9526L26.7588 9.54932L26.7314 9.17334H28.5664L28.4727 8.80908L28.3633 8.3833L28.8027 8.37158L32.3115 8.271L32.7773 8.25732L32.6611 8.7085Z" stroke="#0F1312" stroke-width="0.701754"/>
<path d="M29.6166 7.31837C29.6166 7.31837 29.2853 7.04334 29.3159 6.81711C29.3456 6.59764 29.6457 6.62582 29.7169 6.41611C29.8085 6.14622 29.5164 5.71436 29.5164 5.71436" stroke="#0F1312" stroke-width="0.401002" stroke-linecap="square"/>
<path d="M30.6723 7.41871C30.6723 7.41871 30.1753 7.00617 30.2211 6.66683C30.2656 6.33762 30.7159 6.3799 30.8226 6.06533C30.9601 5.66049 30.5219 5.0127 30.5219 5.0127" stroke="#0F1312" stroke-width="0.401002" stroke-linecap="square"/>
<path d="M26.169 9.78076C26.1961 9.78136 26.2861 9.79243 26.3652 9.8317C26.4392 9.86842 26.4731 9.95128 26.4969 10.0291C26.5308 10.1402 26.504 10.2149 26.4622 10.3157C26.4357 10.3797 26.3837 10.4139 26.3059 10.4657C26.2222 10.5215 26.1315 10.519 26.0673 10.5051C25.9959 10.4897 25.9741 10.4153 25.945 10.3402C25.8793 10.1709 25.9279 9.9039 25.9571 9.85234C25.9827 9.83506 26.0139 9.82496 26.0444 9.82121C26.0587 9.82009 26.0708 9.82058 26.0849 9.82741" stroke="#0F1312" stroke-width="1.20301" stroke-linecap="round"/>
</svg>`;

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBackPress = () => {
    // Check if we can go back, otherwise navigate to home
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };
  const onSignInPress = async () => {
    if (!isLoaded) return;

    setLoading(true);
    try {
      const completeSignIn = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (completeSignIn.status === 'complete') {
        await setActive({ session: completeSignIn.createdSessionId });
        router.replace('/');
      }
    } catch (err: any) {
      Alert.alert('Error', err.errors?.[0]?.message || 'Failed to sign in');
    }
    setLoading(false);
  };

  const onGoogleSignIn = async () => {
    try {
      const { createdSessionId, signUp } = await startOAuthFlow({
        redirectUrl: Linking.createURL('/'),
      });

      if (createdSessionId) {
        await setActive!({ session: createdSessionId });

        if (signUp?.createdUserId) {
          try {
            await createOrUpdateProfile({
              userId: signUp.createdUserId,
              username: '',
              firstName: signUp.firstName || '',
              lastName: signUp.lastName || '',
              email: signUp.emailAddress || '',
              profileImageUrl: null,
              location: null,
              preferences: [],
              onboardingCompleted: false,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create profile';
            console.error('Failed to create profile:', errorMessage);
            Alert.alert(
              'Profile Creation Error',
              errorMessage + '. Please try signing in again.'
            );
            return;
          }
        }

        router.replace('/');
      }
    } catch (err: any) {
      Alert.alert('Error', err.errors?.[0]?.message || 'Failed to sign in with Google');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <ArrowLeft size={24} color="#1C1C1E" />
          </TouchableOpacity>

          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>

          <View style={styles.logoContainer}>
            <SvgXml xml={beanLogoSvg} width={48} height={81} />
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. johnsmith@gmail.com"
                placeholderTextColor="#8E8E93"
                value={emailAddress}
                onChangeText={setEmailAddress}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter Password"
                  placeholderTextColor="#8E8E93"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#8E8E93" />
                  ) : (
                    <Eye size={20} color="#8E8E93" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.dividerContainer}>
              <Text style={styles.dividerText}>or</Text>
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={onGoogleSignIn}
            >
              <Text style={styles.socialButtonText}>G</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.signInButton, loading && styles.buttonDisabled]}
              onPress={onSignInPress}
              disabled={loading || !emailAddress || !password}
            >
              <Text style={styles.signInButtonText}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    marginBottom: 32,
  },
  progressFill: {
    height: '100%',
    width: '50%',
    backgroundColor: '#1C1C1E',
    borderRadius: 2,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingHorizontal: 0,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
  },
  eyeIcon: {
    padding: 8,
  },
  dividerContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
  googleButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    marginBottom: 32,
  },
  socialButtonText: {
    fontSize: 20,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
  signInButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  signInButtonText: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#FFFFFF',
  },
});
