import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { CRACKED_BEAN_SVG, CRACKED_BEAN_RATIO } from '@/constants/beans';
import {
  SHARE_BEAN_HEIGHT,
  SHARE_BEAN_LEFT_D,
  SHARE_BEAN_RIGHT_D,
  SHARE_BEAN_WIDTH,
  shareSeedSvg,
} from '@/constants/shareIcons';
import { colors } from '@/constants/theme';

interface BeanRatingProps {
  rating: number;
  /** Bean height in pt. */
  size?: number;
  interactive?: boolean;
  /** When interactive, allow tapping the left/right half of a bean for 0.5 steps. */
  allowHalf?: boolean;
  onRatingChange?: (rating: number) => void;
  /** Tint override for the filled seeds (e.g. contrast on a colored background). */
  color?: string;
  /** Display-only: show just the earned beans (2.5 renders two full beans and
   *  one left seed) with no grey placeholders. Ignored when interactive. */
  hideEmpty?: boolean;
}

export type BeanFill = 'empty' | 'half' | 'full';

function getFill(index: number, rating: number): BeanFill {
  if (rating >= index) return 'full';
  if (rating >= index - 0.5) return 'half';
  return 'empty';
}

/** Width of the share bean relative to its height. */
export const SHARE_BEAN_RATIO = SHARE_BEAN_WIDTH / SHARE_BEAN_HEIGHT;

const SHARE_SEEDS = {
  leftFilled: shareSeedSvg(SHARE_BEAN_LEFT_D, colors.beanFill),
  rightFilled: shareSeedSvg(SHARE_BEAN_RIGHT_D, colors.beanFill),
  leftEmpty: shareSeedSvg(SHARE_BEAN_LEFT_D, colors.accent),
  rightEmpty: shareSeedSvg(SHARE_BEAN_RIGHT_D, colors.accent),
};

function seedXml(side: 'left' | 'right', filled: boolean, color?: string) {
  if (filled && color) {
    return shareSeedSvg(side === 'left' ? SHARE_BEAN_LEFT_D : SHARE_BEAN_RIGHT_D, color);
  }
  if (side === 'left') return filled ? SHARE_SEEDS.leftFilled : SHARE_SEEDS.leftEmpty;
  return filled ? SHARE_SEEDS.rightFilled : SHARE_SEEDS.rightEmpty;
}

/**
 * One share-style bean (the Share Review bean shape): both seeds stacked in one
 * box, Bean/Fill brown when filled and solid Accent grey when empty. A `half`
 * fill colours only the left seed. Sized by height so it drops in wherever the
 * old half-bean artwork was used. Shared with SwipeableBeanRating.
 */
export function ShareBeanCell({
  height,
  fill,
  color,
  hideEmpty = false,
}: {
  height: number;
  fill: BeanFill;
  color?: string;
  /** Skip unfilled seeds instead of drawing them grey. */
  hideEmpty?: boolean;
}) {
  const width = height * SHARE_BEAN_RATIO;
  const showLeft = fill !== 'empty' || !hideEmpty;
  const showRight = fill === 'full' || !hideEmpty;
  return (
    <View style={{ width, height }}>
      {showLeft && (
        <View style={StyleSheet.absoluteFill}>
          <SvgXml xml={seedXml('left', fill !== 'empty', color)} width={width} height={height} />
        </View>
      )}
      {showRight && (
        <View style={StyleSheet.absoluteFill}>
          <SvgXml xml={seedXml('right', fill === 'full', color)} width={width} height={height} />
        </View>
      )}
    </View>
  );
}

/** A single whole, filled bean for compact "X.X" rating displays. */
export function CoffeeBean({ size = 16, color }: { size?: number; color?: string }) {
  const xml = color ? CRACKED_BEAN_SVG.replace(/#612B05/g, color) : CRACKED_BEAN_SVG;
  return <SvgXml xml={xml} width={size * CRACKED_BEAN_RATIO} height={size} />;
}

export default function BeanRating({
  rating,
  size = 16,
  interactive = false,
  allowHalf = false,
  onRatingChange,
  color,
  hideEmpty = false,
}: BeanRatingProps) {
  const handlePress = (value: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(value);
    }
  };

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((index) => {
        const fill = getFill(index, rating);

        if (!interactive && hideEmpty) {
          if (fill === 'empty') return null;
          return <ShareBeanCell key={index} height={size} fill={fill} color={color} hideEmpty />;
        }

        if (interactive && allowHalf) {
          // Two invisible touch halves overlay the bean so tapping the left
          // half selects X.5 and the right half selects X.
          return (
            <View key={index} style={styles.button}>
              <ShareBeanCell height={size} fill={fill} color={color} />
              <View style={styles.halfOverlay}>
                <TouchableOpacity
                  style={styles.halfTouch}
                  onPress={() => handlePress(index - 0.5)}
                />
                <TouchableOpacity
                  style={styles.halfTouch}
                  onPress={() => handlePress(index)}
                />
              </View>
            </View>
          );
        }

        if (interactive) {
          return (
            <TouchableOpacity
              key={index}
              onPress={() => handlePress(index)}
              style={styles.button}
            >
              <ShareBeanCell height={size} fill={fill} color={color} />
            </TouchableOpacity>
          );
        }

        return <ShareBeanCell key={index} height={size} fill={fill} color={color} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  button: {
    padding: 2,
  },
  halfOverlay: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
  },
  halfTouch: {
    flex: 1,
  },
});
