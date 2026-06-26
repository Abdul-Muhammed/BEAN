import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SettingsHeader from '../../components/settings/SettingsHeader';
import SettingsSection from '../../components/settings/SettingsSection';
import NotificationToggle from '../../components/settings/NotificationToggle';
import {
  getNotificationsEnabled,
  setNotificationsEnabled,
  hasNotificationPermission,
  requestNotificationPermission,
} from '../../lib/notifications';
import { useToast } from '../../context/ToastContext';
import { colors } from '@/constants/theme';

export default function NotificationsScreen() {
  const { showToast } = useToast();
  const [enabled, setEnabled] = useState(false);

  // Reflect the persisted preference, gated by the actual OS permission: if the
  // user revoked permission in system settings, the switch should read off.
  useEffect(() => {
    (async () => {
      const [pref, granted] = await Promise.all([
        getNotificationsEnabled(),
        hasNotificationPermission(),
      ]);
      setEnabled(pref && granted);
    })();
  }, []);

  const handleToggle = async (next: boolean) => {
    if (next) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        showToast({
          message: 'Enable notifications for Bean in your device settings',
          variant: 'favorite',
        });
        setEnabled(false);
        await setNotificationsEnabled(false);
        return;
      }
    }
    setEnabled(next);
    await setNotificationsEnabled(next);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <SettingsHeader title="Notifications" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection>
          <NotificationToggle value={enabled} onValueChange={handleToggle} />
        </SettingsSection>

        <Text style={styles.description}>
          More granular controls are on the way. For now, one switch covers everything.
        </Text>
      </ScrollView>
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
  description: {
    marginTop: 14,
    paddingHorizontal: 4,
    fontSize: 13,
    fontFamily: 'Lato-Regular',
    color: '#777777',
    lineHeight: 19,
  },
});
