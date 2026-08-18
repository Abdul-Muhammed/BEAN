import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import BeanRating from '../BeanRating';
import { BEAN_WORDMARK_RATIO, BEAN_WORDMARK_SVG } from '@/constants/shareIcons';
import { UserReview } from '../../data/mockData';

/**
 * The shareable story sticker for a review — Figma node 713:13604.
 *
 * Deliberately spare (cafe name, rating, wordmark and nothing else) because it
 * is exported as a *transparent* PNG and layered over whatever background the
 * user already has in their Instagram Story. Anything more would fight it.
 *
 * The same component backs both the on-screen preview and the off-screen
 * capture, so what the user sees is exactly what gets exported — the only
 * difference is `width`.
 */

/** Story format: 1080x1920. The Figma frame is 229.5x408, the same 9:16. */
export const STORY_ASPECT_RATIO = 9 / 16;
/** Width the sticker is rasterised at for export. */
export const STORY_EXPORT_WIDTH = 1080;
/** Width of the Figma artboard every measurement below is expressed against. */
const DESIGN_WIDTH = 229.5;

export type StoryCardVariant = 'transparent';

interface ReviewStoryCardProps {
  review: Pick<UserReview, 'cafeName' | 'rating'>;
  /** Rendered width in px. Everything else scales off this. */
  width: number;
  /**
   * Reserved for the second background style that exists (hidden) in the Figma
   * previews row. Only 'transparent' is implemented.
   */
  variant?: StoryCardVariant;
}

export default function ReviewStoryCard({
  review,
  width,
  variant = 'transparent',
}: ReviewStoryCardProps) {
  // Scale factor from the Figma artboard to the requested width, so the preview
  // and the 1080px export stay pixel-identical in proportion.
  const s = width / DESIGN_WIDTH;

  const wordmarkWidth = 17.759 * s;

  return (
    <View
      style={[
        styles.card,
        { width, height: width / STORY_ASPECT_RATIO },
        variant === 'transparent' && styles.transparent,
      ]}
    >
      <View style={[styles.content, { gap: 5.11 * s, paddingVertical: 5.1 * s }]}>
        <View style={[styles.cafeRow, { gap: 2.55 * s }]}>
          <MapPin size={9.978 * s} color="#FFFFFF" />
          <Text style={[styles.cafeName, { fontSize: 9.978 * s }]} numberOfLines={1}>
            {review.cafeName}
          </Text>
        </View>

        <BeanRating rating={review.rating} size={36.33 * s} color="#FFFFFF" />

        <SvgXml
          xml={BEAN_WORDMARK_SVG}
          width={wordmarkWidth}
          height={wordmarkWidth / BEAN_WORDMARK_RATIO}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Every layer stays transparent so captureRef({ format: 'png' }) keeps the
  // alpha channel instead of baking in a white backdrop.
  transparent: {
    backgroundColor: 'transparent',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cafeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cafeName: {
    fontFamily: 'Lato-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
