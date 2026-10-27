import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { BEAN_EMPTY_OPACITY } from '@/constants/beans';
import {
  SHARE_BEAN_FILLED_SVG,
  SHARE_BEAN_HEIGHT,
  SHARE_BEAN_TRANSPARENT_SVG,
  SHARE_BEAN_WIDTH,
  SHARE_HEADER_EAN_SVG,
  SHARE_HEADER_LOGO_SVG,
  SHARE_HEADER_MR_BEAN_SVG,
} from '@/constants/shareIcons';
import { UserReview } from '../../data/mockData';

/**
 * The shareable story sticker for a review. It comes in two templates from the
 * Figma file 2k0jn7hENJ5HZ8wTYwQbCi:
 *  - 'filled' (741:14413): solid cream beans under the BEAN lockup.
 *  - 'transparent' (741:14578): white outline beans under Mr. Bean.
 *
 * It is exported as a *transparent* PNG and layered over whatever background the
 * user already has in their Instagram Story. In Figma the photo behind the card
 * is only a mock and is never part of the export.
 *
 * The same component backs both the on-screen preview and the off-screen
 * capture, so what the user sees is exactly what gets exported — the only
 * difference is `width`.
 */

/** Story format: 1080x1920 (9:16). */
export const STORY_ASPECT_RATIO = 9 / 16;
/** Width the sticker is rasterised at for export. */
export const STORY_EXPORT_WIDTH = 1080;
/** Width of the Figma artboard every measurement below is expressed against. */
const DESIGN_WIDTH = 1080;

export type StoryCardVariant = 'filled' | 'transparent';

const TEXT_COLOR = '#FFFFFF';

interface ReviewStoryCardProps {
  review: Pick<UserReview, 'cafeName' | 'rating' | 'orderedItem' | 'visitDate' | 'date'>;
  /** Rendered width in px. Everything else scales off this. */
  width: number;
  variant?: StoryCardVariant;
}

type Fill = 'empty' | 'half' | 'full';

// Same thresholds as components/BeanRating.tsx, so a review reads the same here.
function getFill(index: number, rating: number): Fill {
  if (rating >= index) return 'full';
  if (rating >= index - 0.5) return 'half';
  return 'empty';
}

/** A bean that is solid, faded, or split down the middle for a half rating. */
function ShareBean({ xml, fill, s }: { xml: string; fill: Fill; s: number }) {
  const width = SHARE_BEAN_WIDTH * s;
  const height = SHARE_BEAN_HEIGHT * s;
  return (
    <View style={{ width, height }}>
      <View style={{ opacity: fill === 'full' ? 1 : BEAN_EMPTY_OPACITY }}>
        <SvgXml xml={xml} width={width} height={height} />
      </View>
      {fill === 'half' && (
        <View style={[styles.halfClip, { width: width / 2, height }]}>
          <SvgXml xml={xml} width={width} height={height} />
        </View>
      )}
    </View>
  );
}

function ordinalSuffix(day: number): string {
  if (day % 100 >= 11 && day % 100 <= 13) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Rating as the big headline number: '5', '3.5'. */
function formatRating(rating: number): string {
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
}

export default function ReviewStoryCard({
  review,
  width,
  variant = 'filled',
}: ReviewStoryCardProps) {
  // Scale factor from the Figma artboard to the requested width, so the preview
  // and the 1080px export stay pixel-identical in proportion.
  const s = width / DESIGN_WIDTH;
  const beanXml = variant === 'filled' ? SHARE_BEAN_FILLED_SVG : SHARE_BEAN_TRANSPARENT_SVG;

  const text = (size: number, fontFamily: string) => ({
    fontFamily,
    fontSize: size * s,
    lineHeight: size * 1.1 * s,
  });

  // visit_date is a bare 'YYYY-MM-DD'; parse it literally so the timezone can't
  // shift the day. Reviews don't store a time, so the Figma "at 6:19am" is left out.
  const visit = review.visitDate ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(review.visitDate) : null;
  const day = visit ? Number(visit[3]) : 0;

  return (
    <View style={[styles.card, { width, height: width / STORY_ASPECT_RATIO }]}>
      <View style={[styles.content, { gap: 80 * s, paddingVertical: 48 * s }]}>
        {variant === 'filled' ? (
          <View style={[styles.row, { gap: 4.273 * s }]}>
            <SvgXml xml={SHARE_HEADER_LOGO_SVG} width={28.779 * s} height={40 * s} />
            <SvgXml xml={SHARE_HEADER_EAN_SVG} width={105.961 * s} height={40 * s} />
          </View>
        ) : (
          // The artwork runs 1.1% below its Figma frame (46.865 tall); keep the
          // frame height for layout and let the feet hang over.
          <View style={{ width: 27.603 * s, height: 46.865 * s }}>
            <SvgXml xml={SHARE_HEADER_MR_BEAN_SVG} width={27.603 * s} height={47.377 * s} />
          </View>
        )}

        <View style={[styles.block, { gap: 16 * s }]}>
          <View style={[styles.row, { gap: 8 * s }]}>
            <Text style={[styles.text, { fontFamily: 'Lato-Black', fontSize: 120 * s, lineHeight: 120 * s }]}>
              {formatRating(review.rating)}
            </Text>
            <Text style={[styles.text, text(16, 'Lato-Light')]}>/5</Text>
          </View>
          <Text style={[styles.text, text(24, 'Lato-Regular')]}>Rating</Text>
        </View>

        <View style={[styles.block, { gap: 16 * s }]}>
          <Text style={[styles.text, text(32, 'Lato-Regular'), { maxWidth: 960 * s }]} numberOfLines={2}>
            {review.cafeName}
          </Text>
          <Text style={[styles.text, text(24, 'Lato-Regular')]}>Café</Text>
        </View>

        {!!review.orderedItem && (
          <View style={[styles.block, { gap: 16 * s }]}>
            <Text style={[styles.text, text(32, 'Lato-Regular'), { maxWidth: 960 * s }]} numberOfLines={2}>
              {review.orderedItem}
            </Text>
            <Text style={[styles.text, text(24, 'Lato-Regular')]}>Order</Text>
          </View>
        )}

        <View style={[styles.block, { gap: 24 * s, paddingVertical: 23.953 * s }]}>
          <View
            style={[
              styles.row,
              { gap: 23.433 * s, paddingHorizontal: 31.243 * s, paddingVertical: 23.432 * s },
            ]}
          >
            {[1, 2, 3, 4, 5].map((index) => (
              <ShareBean key={index} xml={beanXml} fill={getFill(index, review.rating)} s={s} />
            ))}
          </View>

          {visit ? (
            <View style={styles.dateRow}>
              <Text style={[styles.text, text(24, 'Lato-Regular')]}>
                {`${MONTHS[Number(visit[2]) - 1]}, ${day}`}
              </Text>
              <Text style={[styles.text, text(12, 'Lato-Regular')]}>{ordinalSuffix(day)}</Text>
              <Text style={[styles.text, text(24, 'Lato-Regular')]}>{`, ${visit[1]}`}</Text>
            </View>
          ) : (
            <Text style={[styles.text, text(24, 'Lato-Regular')]}>{review.date}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

// Every layer stays transparent so captureRef({ format: 'png' }) keeps the alpha
// channel instead of baking in a backdrop.
const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  block: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  text: {
    color: TEXT_COLOR,
    textAlign: 'center',
  },
  halfClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
});
