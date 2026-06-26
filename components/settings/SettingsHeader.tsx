import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';

interface SettingsHeaderProps {
  title: string;
}

/** Standard back-button + centered-title header shared by all settings screens. */
export default function SettingsHeader({ title }: SettingsHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        hitSlop={10}
        activeOpacity={0.7}
      >
        <ArrowLeft size={24} color={colors.primary} />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {/* Spacer to keep the title centered against the back button. */}
      <View style={styles.backButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ECECEC',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
});
