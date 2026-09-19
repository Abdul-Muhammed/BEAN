import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import BeanLogo from '../BeanLogo';
import { MAP_PIN_12_SVG } from '@/constants/figmaIcons';
import { colors, radius, spacing, type } from '@/constants/theme';

interface CafeCardProps {
  name: string;
  /** Suburb or city. The row is omitted when absent. */
  city?: string;
  /** Pre-formatted distance, e.g. "2.1 km". Omitted when unknown. */
  distanceLabel?: string;
  imageUri?: string | null;
  onPress?: () => void;
  /** Top-right element: a save toggle on Home, a remove control in the editor. */
  trailing?: React.ReactNode;
  /** Bottom row: tags plus a score on Home, a bean spread in the editor. */
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The horizontal cafe card: an 87pt square image beside a title block and a
 * footer row. Home and the Top Cafes editor use the same card and differ only
 * in what they pass as `trailing` and `footer`.
 */
export default function CafeCard({
  name,
  city,
  distanceLabel,
  imageUri,
  onPress,
  trailing,
  footer,
  style,
}: CafeCardProps) {
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

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {!!city && (
              <View style={styles.locationRow}>
                <SvgXml xml={MAP_PIN_12_SVG} width={12} height={12} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {city}
                </Text>
                {!!distanceLabel && (
                  <>
                    <Text style={styles.locationText}>•</Text>
                    <Text style={styles.locationText}>{distanceLabel}</Text>
                  </>
                )}
              </View>
            )}
          </View>
          {trailing}
        </View>

        {footer ? <View style={styles.footerRow}>{footer}</View> : null}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.separator,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  image: {
    width: 87,
    height: 87,
    backgroundColor: colors.greyExtraLight,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  body: {
    flex: 1,
    gap: spacing.md,
    padding: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleText: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    ...type.title1,
    color: colors.ink,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationText: {
    ...type.footnote1,
    color: colors.slate,
    flexShrink: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
