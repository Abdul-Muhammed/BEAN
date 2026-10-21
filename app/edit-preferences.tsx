import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import Button from '../components/ui/Button';
import Tag from '../components/ui/Tag';
import TopAppBar from '../components/ui/TopAppBar';
import { useToast } from '../context/ToastContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { updateProfile } from '../lib/profile';
import { type CafeCategory, getCafeCategories } from '../lib/cafeCategories';
import { colors, radius, spacing, type } from '@/constants/theme';

/** Edit the cafe categories picked during onboarding, from the profile's
 *  Preferences pencil. Same taxonomy as onboarding, without the onboarding
 *  side effects (username checks, completing onboarding). */
export default function EditPreferencesScreen() {
  const router = useRouter();
  const { profile, refetch } = useUserProfile();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<CafeCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setCategories(await getCafeCategories());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load cafe categories.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Seed from the saved preferences once, so a later profile refetch can't
  // wipe out picks made on this screen.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !profile) return;
    seededRef.current = true;
    setSelected(Array.isArray(profile.preferences) ? (profile.preferences as string[]) : []);
  }, [profile]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ preferences: selected });
      await refetch();
      showToast({ message: 'Preferences updated', variant: 'success' });
      router.back();
    } catch (err) {
      setSaving(false);
      showToast({
        message: err instanceof Error ? err.message : 'Could not save your preferences',
        variant: 'favorite',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <TopAppBar title="Edit Preferences" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>Pick the kinds of cafes you like</Text>

        {isLoading ? (
          <ActivityIndicator color={colors.ink} style={styles.spinner} />
        ) : loadError ? (
          <View style={styles.stateBlock}>
            <Text style={styles.stateText}>{loadError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadCategories}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : categories.length === 0 ? (
          <Text style={styles.stateText}>No cafe categories are available.</Text>
        ) : (
          <View style={styles.chips}>
            {categories.map((category) => (
              <Tag
                key={category.id}
                label={category.label}
                iconXml={category.icon_svg_xml}
                variant={selected.includes(category.id) ? 'filled' : 'outline'}
                onPress={() => toggle(category.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
        <Button
          label="Save"
          onPress={handleSave}
          loading={saving}
          disabled={isLoading || !!loadError}
          style={styles.saveButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  subtitle: {
    ...type.body1,
    color: colors.greyNormal,
  },
  spinner: {
    marginVertical: spacing.lg,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stateBlock: {
    gap: spacing.md,
  },
  stateText: {
    ...type.body1,
    color: colors.greyNormal,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  retryText: {
    ...type.body1,
    color: colors.cream,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  saveButton: {
    flex: 1,
  },
});
