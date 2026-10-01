import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import Tag from '../ui/Tag';
import SectionHeader from './SectionHeader';
import { PENCIL_SVG } from '@/constants/figmaIcons';
import { getCafeCategories, type CafeCategory } from '../../lib/cafeCategories';
import { spacing } from '@/constants/theme';

interface PreferencesSectionProps {
  preferenceIds: string[];
  onPressEdit?: () => void;
  /** Hidden when viewing another user's profile. */
  editable?: boolean;
}

/** The user's chosen preferences as pill chips. Labels and icons come from the
 *  live cafe_categories table so they always match the onboarding taxonomy. */
export default function PreferencesSection({
  preferenceIds,
  onPressEdit,
  editable = true,
}: PreferencesSectionProps) {
  const [categories, setCategories] = useState<CafeCategory[]>([]);

  useEffect(() => {
    let mounted = true;
    getCafeCategories()
      .then((data) => {
        if (mounted) setCategories(data);
      })
      .catch((err) => console.warn('Failed to load preference categories:', err));
    return () => {
      mounted = false;
    };
  }, []);

  // Keep only the user's selected categories, in the catalog's display order.
  const chips = useMemo(() => {
    const ids = new Set(preferenceIds ?? []);
    return categories.filter((c) => ids.has(c.id));
  }, [categories, preferenceIds]);

  if (chips.length === 0) return null;

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Preferences"
        action={editable ? <SvgXml xml={PENCIL_SVG} width={16} height={16} /> : undefined}
        onPressAction={onPressEdit}
        accessibilityLabel="Edit your preferences"
      />
      <View style={styles.chips}>
        {chips.map((chip) => (
          <Tag key={chip.id} label={chip.label} iconXml={chip.icon_svg_xml} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
