import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ListPlus } from 'lucide-react-native';
import { colors, fonts } from '@/constants/theme';

export default function CreateListScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Create List</Text>
        <View style={styles.iconButtonPlaceholder} />
      </View>

      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <ListPlus size={32} color={colors.gold} />
        </View>
        <Text style={styles.title}>Custom lists are coming soon</Text>
        <Text style={styles.subtitle}>
          Soon you'll be able to create your own named lists and organise cafes
          exactly how you like.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.warmBorder,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPlaceholder: {
    width: 40,
  },
  screenTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.primary,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.warmSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.mutedText,
    textAlign: 'center',
    lineHeight: 22,
  },
});
