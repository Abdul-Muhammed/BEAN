import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Pencil } from 'lucide-react-native';
import SectionHeader from './SectionHeader';
import { getCafeCategories, type CafeCategory } from '../../lib/cafeCategories';
import { colors } from '@/constants/theme';

interface PreferencesSectionProps {
  preferenceIds: string[];
  onPressEdit?: () => void;
}

/** Renders the user's selected preferences as pill chips. Chips are derived from
 *  the live cafe_categories table (label + icon_svg_xml) so they always match the
 *  onboarding/discovery taxonomy. */
export default function PreferencesSection({
  preferenceIds,
  onPressEdit,
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
        action={<Pencil size={18} color="#8E8E93" />}
        onPressAction={onPressEdit}
      />
      <View style={styles.chips}>
        {chips.map((chip) => (
          <View key={chip.id} style={styles.chip}>
            {chip.icon_svg_xml ? (
              <SvgXml xml={chip.icon_svg_xml} width={16} height={16} />
            ) : null}
            <Text style={styles.chipText}>{chip.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.warmBorder,
    backgroundColor: colors.warmSurface,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Lato-Bold',
    color: '#4A4A4A',
  },
});
