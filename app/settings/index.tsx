import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { User, Bell, Info, LogOut } from 'lucide-react-native';
import { BIN_SVG } from '@/constants/profileIcons';
import SettingsHeader from '../../components/settings/SettingsHeader';
import SettingsSection from '../../components/settings/SettingsSection';
import SettingsListItem from '../../components/settings/SettingsListItem';
import ConfirmationModal from '../../components/settings/ConfirmationModal';
import { useAuth } from '../../context/AuthContext';
import { deleteAccount } from '../../lib/profile';
import { useToast } from '../../context/ToastContext';
import { colors } from '@/constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { showToast } = useToast();

  const [signOutVisible, setSignOutVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSignOut = async () => {
    setSignOutVisible(false);
    await signOut();
    router.replace('/');
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      await signOut();
      router.replace('/');
    } catch (err) {
      setDeleting(false);
      setDeleteVisible(false);
      showToast({
        message: err instanceof Error ? err.message : 'Failed to delete account',
        variant: 'favorite',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <SettingsHeader title="Settings" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection>
          <SettingsListItem
            icon={<User size={22} color={colors.primary} />}
            title="Personal Details"
            description="Update your account information and profile details."
            onPress={() => router.push('/settings/edit-profile')}
          />
          <SettingsListItem
            icon={<Bell size={22} color={colors.primary} />}
            title="Notifications"
            description="Choose how and when you want to receive alerts."
            onPress={() => router.push('/settings/notifications')}
          />
          <SettingsListItem
            icon={<Info size={22} color={colors.primary} />}
            title="About Us"
            description="Learn about our mission, view our privacy policy, or check app details."
            onPress={() => router.push('/settings/about')}
          />
        </SettingsSection>

        <View style={styles.gap} />

        <SettingsSection>
          <SettingsListItem
            icon={<LogOut size={22} color={colors.primary} />}
            title="Sign Out"
            right={null}
            onPress={() => setSignOutVisible(true)}
          />
        </SettingsSection>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.deleteRow}
          onPress={() => setDeleteVisible(true)}
          activeOpacity={0.7}
          hitSlop={10}
        >
          <SvgXml xml={BIN_SVG} width={14} height={16} />
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      <ConfirmationModal
        visible={signOutVisible}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign Out"
        destructive
        onConfirm={handleSignOut}
        onCancel={() => setSignOutVisible(false)}
      />

      <ConfirmationModal
        visible={deleteVisible}
        title="Delete Account"
        message="This permanently deletes your account, reviews, and saved cafes. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  gap: {
    height: 24,
  },
  footer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteText: {
    fontSize: 15,
    fontFamily: 'Lato-Bold',
    color: '#C22938',
  },
});
