import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Bookmark, Heart } from 'lucide-react-native';
import SettingsHeader from '../../components/settings/SettingsHeader';
import SettingsSection from '../../components/settings/SettingsSection';
import ExternalLinkRow from '../../components/settings/ExternalLinkRow';
import AboutCard from '../../components/settings/AboutCard';
import FooterActionButton from '../../components/settings/FooterActionButton';
import { CoffeeBean } from '../../components/BeanRating';
import { EXTERNAL_LINKS } from '@/constants/links';
import { colors } from '@/constants/theme';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function AboutScreen() {
  const open = (url: string) => {
    Linking.openURL(url).catch(() => {
      // Swallow: nothing actionable if the OS can't open the link.
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <SettingsHeader title="About Us" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AboutCard appName="BEAN" version={APP_VERSION} />

        <View style={styles.linksGap} />

        <SettingsSection>
          <ExternalLinkRow
            title="Privacy Policy"
            subtitle="How we handle your data"
            onPress={() => open(EXTERNAL_LINKS.privacyPolicy)}
          />
          <ExternalLinkRow
            title="Terms of Service"
            subtitle="Rules for using Bean"
            onPress={() => open(EXTERNAL_LINKS.termsOfService)}
          />
          <ExternalLinkRow
            title="Rate on App Store"
            subtitle="Enjoying the app? Leave a review"
            onPress={() => open(EXTERNAL_LINKS.appStoreReview)}
          />
        </SettingsSection>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <FooterActionButton
            icon={<CoffeeBean size={20} />}
            label="Instagram"
            onPress={() => open(EXTERNAL_LINKS.instagram)}
          />
          <FooterActionButton
            icon={<Bookmark size={20} color={colors.primary} />}
            label="Submit Feedback"
            onPress={() => open(EXTERNAL_LINKS.feedback)}
          />
          <FooterActionButton
            icon={<Heart size={20} color={colors.primary} />}
            label="TikTok"
            onPress={() => open(EXTERNAL_LINKS.tiktok)}
          />
        </View>
        <Text style={styles.footerText}>Made with ☕ from Auckland, NZ.</Text>
      </View>
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
  linksGap: {
    height: 24,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    backgroundColor: colors.white,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  footerText: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'Lato-Regular',
    color: '#777777',
  },
});
