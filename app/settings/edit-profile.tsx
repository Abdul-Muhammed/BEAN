import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import SettingsHeader from '../../components/settings/SettingsHeader';
import ProfileAvatarEditor from '../../components/settings/ProfileAvatarEditor';
import { useAuth } from '../../context/AuthContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import { updateProfile, isUsernameAvailable } from '../../lib/profile';
import { uploadAvatar } from '../../lib/storage';
import { useToast } from '../../context/ToastContext';
import { colors } from '@/constants/theme';

const BIO_LIMIT = 150;

type UsernameStatus = 'unchanged' | 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

function normalizeUsername(raw: string): string {
  // lowercase, strip spaces and anything not a-z0-9._
  return raw.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9._]/g, '');
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, refetch } = useUserProfile();
  const { showToast } = useToast();

  const currentUsername = useMemo(() => {
    const u = profile?.username?.trim();
    return u && !u.startsWith('temp_') ? u : '';
  }, [profile?.username]);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [pickedAvatar, setPickedAvatar] = useState<{ uri: string; base64: string } | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('unchanged');
  const [saving, setSaving] = useState(false);

  // Seed the form once the profile loads.
  useEffect(() => {
    if (!profile) return;
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
    setFullName(name);
    setUsername(currentUsername);
    setBio(profile.bio ?? '');
  }, [profile, currentUsername]);

  // Debounced username availability check.
  useEffect(() => {
    if (username === currentUsername) {
      setUsernameStatus('unchanged');
      return;
    }
    if (username.length < 4) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    const handle = setTimeout(async () => {
      try {
        const available = await isUsernameAvailable(username, user?.id);
        setUsernameStatus(available ? 'available' : 'taken');
      } catch {
        // Inconclusive — let the DB constraint be the final arbiter on save.
        setUsernameStatus('idle');
      }
    }, 450);
    return () => clearTimeout(handle);
  }, [username, currentUsername, user?.id]);

  const canSave =
    !saving &&
    fullName.trim().length > 0 &&
    usernameStatus !== 'checking' &&
    usernameStatus !== 'taken' &&
    usernameStatus !== 'invalid';

  const handleSave = async () => {
    if (!canSave || !user?.id) return;
    setSaving(true);
    try {
      let profileImageUrl: string | undefined;
      if (pickedAvatar) {
        profileImageUrl = await uploadAvatar(user.id, { base64: pickedAvatar.base64 });
      }

      const trimmedName = fullName.trim();
      const firstSpace = trimmedName.indexOf(' ');
      const firstName = firstSpace === -1 ? trimmedName : trimmedName.slice(0, firstSpace);
      const lastName = firstSpace === -1 ? '' : trimmedName.slice(firstSpace + 1).trim();

      await updateProfile({
        firstName,
        lastName,
        bio,
        ...(username !== currentUsername ? { username } : {}),
        ...(profileImageUrl ? { profileImageUrl } : {}),
      });

      await refetch();
      showToast({ message: 'Profile updated', variant: 'saved' });
      router.back();
    } catch (err) {
      setSaving(false);
      showToast({
        message: err instanceof Error ? err.message : 'Failed to save profile',
        variant: 'favorite',
      });
    }
  };

  const usernameHint = (() => {
    switch (usernameStatus) {
      case 'invalid':
        return { text: 'At least 4 characters, lowercase, no spaces', color: '#8E8E93' };
      case 'checking':
        return { text: 'Checking availability…', color: '#8E8E93' };
      case 'available':
        return { text: 'Available', color: '#4CAF50' };
      case 'taken':
        return { text: 'That username is already taken', color: colors.danger };
      default:
        return null;
    }
  })();

  const avatarUri = pickedAvatar?.uri || profile?.profile_image_url;
  const fallbackInitial = (fullName || username || 'U').charAt(0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <SettingsHeader title="Edit Profile" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarSection}>
            <ProfileAvatarEditor
              imageUri={avatarUri}
              fallbackInitial={fallbackInitial}
              onPicked={setPickedAvatar}
            />
          </View>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your name"
            placeholderTextColor="#B0B0B5"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Username</Text>
          <View style={styles.usernameRow}>
            <Text style={styles.atSign}>@</Text>
            <TextInput
              style={styles.usernameInput}
              value={username}
              onChangeText={(t) => setUsername(normalizeUsername(t))}
              placeholder="username"
              placeholderTextColor="#B0B0B5"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {usernameStatus === 'checking' ? <ActivityIndicator size="small" /> : null}
          </View>
          {usernameHint ? (
            <Text style={[styles.hint, { color: usernameHint.color }]}>
              {usernameHint.text}
            </Text>
          ) : null}

          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={(t) => setBio(t.slice(0, BIO_LIMIT))}
            placeholder="Say a little about yourself..."
            placeholderTextColor="#B0B0B5"
            multiline
            maxLength={BIO_LIMIT}
          />
          <Text style={styles.counter}>
            {bio.length}/{BIO_LIMIT}
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Lato-Bold',
    color: '#777777',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 4,
  },
  atSign: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#8E8E93',
  },
  usernameInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
  },
  hint: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: 'Lato-Regular',
  },
  bioInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: 6,
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.warmBorder,
  },
  cancelButton: {
    flex: 3,
    borderWidth: 1,
    borderColor: colors.black,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: colors.black,
  },
  saveButton: {
    flex: 7,
    backgroundColor: colors.black,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  saveText: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#FFFFFF',
  },
});
