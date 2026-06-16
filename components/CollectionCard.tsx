import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { CoffeeBean } from './BeanRating';
import { colors, fonts } from '@/constants/theme';

interface CollectionCardProps {
  title: string;
  count: number;
  // Cover images for the collage (we use the first three). Any missing slot
  // renders a warm placeholder panel so the collage always looks intentional.
  images: string[];
  icon: React.ReactNode;
  onPress: () => void;
}

const PANEL_COUNT = 3;

export default function CollectionCard({
  title,
  count,
  images,
  icon,
  onPress,
}: CollectionCardProps) {
  const panels = Array.from({ length: PANEL_COUNT }, (_, i) => images[i]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.collage}>
        {panels.map((uri, index) => (
          <View
            key={index}
            style={[styles.panel, index < PANEL_COUNT - 1 && styles.panelDivider]}
          >
            {uri ? (
              <Image source={{ uri }} style={styles.panelImage} resizeMode="cover" />
            ) : (
              <View style={styles.panelPlaceholder}>
                <CoffeeBean size={22} />
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {icon}
          <View style={styles.footerText}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.count}>
              {count} {count === 1 ? 'Cafe' : 'Cafes'}
            </Text>
          </View>
        </View>
        <ChevronRight size={22} color={colors.mutedText} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E3E3E3',
    marginBottom: 16,
    overflow: 'hidden',
  },
  collage: {
    flexDirection: 'row',
    height: 140,
  },
  panel: {
    flex: 1,
    height: '100%',
  },
  panelDivider: {
    borderRightWidth: 2,
    borderRightColor: colors.surface,
  },
  panelImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.warmSurface,
  },
  panelPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.warmSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  footerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.bodyBold,
    color: colors.primary,
  },
  count: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.mutedText,
    marginTop: 2,
  },
});
