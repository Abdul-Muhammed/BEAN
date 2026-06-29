import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SettingsHeader from '../../components/settings/SettingsHeader';
import SettingsSection from '../../components/settings/SettingsSection';
import NotificationToggle from '../../components/settings/NotificationToggle';
import {
  getNotificationsEnabled,
  setNotificationsEnabled,
} from '../../lib/notifications';
import { colors } from '@/constants/theme';

export default function NotificationsScreen() {
  const [enabled, setEnabled] = useState(false);

  // Reflect the persisted preference. Push delivery isn't wired up yet, so this
  // is a local-only intent flag — no OS permission is requested here. The real
  // permission prompt will land with the future push release.
  useEffect(() => {
    (async () => {
      setEnabled(await getNotificationsEnabled());
    })();
  }, []);

  const handleToggle = async (next: boolean) => {
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
          Push notifications are coming soon. Flip this on to opt in early — we'll
          start sending once they're ready.
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
