import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import {
  BEAN_LEFT_SVG,
  BEAN_RIGHT_SVG,
  BEAN_HALF_RATIO,
  BEAN_EMPTY_OPACITY,
} from '@/constants/beans';

interface BeanRatingProps {
  rating: number;
  size?: number;
  interactive?: boolean;
  /** When interactive, allow tapping the left/right half of a bean for 0.5 steps. */
  allowHalf?: boolean;
  onRatingChange?: (rating: number) => void;
}

type Fill = 'empty' | 'half' | 'full';

function getFill(index: number, rating: number): Fill {
  if (rating >= index) return 'full';
  if (rating >= index - 0.5) return 'half';
  return 'empty';
}

interface BeanCellProps {
  size: number;
  fill: Fill;
  /** Optional tint override (e.g. for contrast on a colored background). */
  color?: string;
}

// Recolor the brand-brown bean artwork to an arbitrary tint when needed.
function tint(xml: string, color?: string) {
  if (!color) return xml;
  return xml.replace(/#612B05/g, color).replace(/#8D3F01/g, color);
}

/**
 * One whole bean = a left half + a right half. Each half is filled (brand brown)
 * or faded (empty). A `half` fill keeps the left half solid and fades the right,
 * giving a clean 0.5-bean rating.
 */
function BeanCell({ size, fill, color }: BeanCellProps) {
  const halfWidth = size * BEAN_HALF_RATIO;
  const leftOpacity = fill === 'empty' ? BEAN_EMPTY_OPACITY : 1;
  const rightOpacity = fill === 'full' ? 1 : BEAN_EMPTY_OPACITY;
  return (
    <View style={styles.bean}>
      <View style={{ opacity: leftOpacity }}>
        <SvgXml xml={tint(BEAN_LEFT_SVG, color)} width={halfWidth} height={size} />
      </View>
      <View style={{ opacity: rightOpacity }}>
        <SvgXml xml={tint(BEAN_RIGHT_SVG, color)} width={halfWidth} height={size} />
      </View>
    </View>
  );
}

/** A single whole, fully-filled bean — for compact "X.X" rating displays. */
export function CoffeeBean({ size = 16, color }: { size?: number; color?: string }) {
  return <BeanCell size={size} fill="full" color={color} />;
}

export default function BeanRating({
  rating,
  size = 16,
  interactive = false,
  allowHalf = false,
  onRatingChange,
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

        if (interactive && allowHalf) {
          // Two invisible touch halves overlay the bean so tapping the left
          // half selects X.5 and the right half selects X.
          return (
            <View key={index} style={styles.button}>
              <BeanCell size={size} fill={fill} />
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
              <BeanCell size={size} fill={fill} />
            </TouchableOpacity>
          );
        }

        return <BeanCell key={index} size={size} fill={fill} />;
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
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  halfTouch: {
    flex: 1,
  },
  bean: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
