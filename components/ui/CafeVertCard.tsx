import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import BeanLogo from '../BeanLogo';
import BeanRating from '../BeanRating';
import { HEART_12_FILLED_SVG } from '@/constants/figmaIcons';
import { colors, radius, spacing, type } from '@/constants/theme';

interface CafeVertCardProps {
  name: string;
  imageUri?: string | null;
  rating: number;
  /** Shows the heart beside the bean spread. */
  favorited?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * The vertical cafe tile used by the Top Cafes 3-up on both profile screens:
 * a square image above the name and a 12pt bean spread.
 */
export default function CafeVertCard({
  name,
  imageUri,
  rating,
  favorited = false,
  onPress,
  style,
}: CafeVertCardProps) {
  const Container: React.ComponentType<any> = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imageFallback]}>
          <BeanLogo width={22} height={38} color={colors.background} />
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.ratingRow}>
          <BeanRating rating={rating} size={12} />
          {favorited && <SvgXml xml={HEART_12_FILLED_SVG} width={12} height={12} />}
        </View>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: spacing.sm,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.greyExtraLight,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  content: {
    gap: spacing.xs,
  },
  name: {
    ...type.title1,
    color: colors.ink,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
