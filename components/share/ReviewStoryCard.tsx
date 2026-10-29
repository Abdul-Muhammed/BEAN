import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { BEAN_EMPTY_OPACITY } from '@/constants/beans';
import {
  SHARE_BEAN_FILLED_LEFT_SVG,
  SHARE_BEAN_FILLED_RIGHT_SVG,
  SHARE_BEAN_HEIGHT,
  SHARE_BEAN_TRANSPARENT_LEFT_SVG,
  SHARE_BEAN_TRANSPARENT_RIGHT_SVG,
  SHARE_BEAN_WIDTH,
  SHARE_HEADER_EAN_SVG,
  SHARE_HEADER_LOGO_SVG,
  SHARE_HEADER_MR_BEAN_SVG,
  SHARE_MAP_PIN_SVG,
} from '@/constants/shareIcons';
import { colors } from '@/constants/theme';
import { UserReview } from '../../data/mockData';

/**
 * The shareable story sticker for a review. It comes in four templates from
 * the Figma file 2k0jn7hENJ5HZ8wTYwQbCi:
 *  - 'filled' (741:14413): solid cream beans under the BEAN lockup.
 *  - 'transparent' (741:14578): white outline beans under Mr. Bean.
 *  - 'compact' (741:14054): a smaller block in the top third of the story, so
 *    the user's photo stays visible underneath.
 *  - 'simple' (740:13390): just the café, the rating beans and the BEAN
 *    lockup, centred on the story.
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

export type StoryCardVariant = 'filled' | 'transparent' | 'compact' | 'simple';

const TEXT_COLOR = '#FFFFFF';

interface ReviewStoryCardProps {
  review: Pick<UserReview, 'cafeName' | 'rating' | 'orderedItem' | 'visitDate' | 'date'>;
  /** Rendered width in px. Everything else scales off this. */
  width: number;
  variant?: StoryCardVariant;
}

type Review = ReviewStoryCardProps['review'];

type Fill = 'empty' | 'half' | 'full';

// Same thresholds as components/BeanRating.tsx, so a review reads the same here.
function getFill(index: number, rating: number): Fill {
  if (rating >= index) return 'full';
  if (rating >= index - 0.5) return 'half';
  return 'empty';
}

interface Seeds {
  left: string;
  right: string;
}

const FILLED_SEEDS: Seeds = { left: SHARE_BEAN_FILLED_LEFT_SVG, right: SHARE_BEAN_FILLED_RIGHT_SVG };
const OUTLINE_SEEDS: Seeds = {
  left: SHARE_BEAN_TRANSPARENT_LEFT_SVG,
  right: SHARE_BEAN_TRANSPARENT_RIGHT_SVG,
};

/**
 * One bean, drawn as its two seeds stacked in the same box. A half rating keeps
 * the left seed solid, like BeanRating. With `showEmpty`, unearned seeds are
 * drawn faded; without it they are left out entirely.
 */
function ShareBean({
  seeds,
  fill,
  width,
  height,
  showEmpty,
}: {
  seeds: Seeds;
  fill: Fill;
  width: number;
  height: number;
  showEmpty: boolean;
}) {
  const leftEarned = fill !== 'empty';
  const rightEarned = fill === 'full';
  return (
    <View style={{ width, height }}>
      {(leftEarned || showEmpty) && (
        <View style={[styles.seed, { opacity: leftEarned ? 1 : BEAN_EMPTY_OPACITY }]}>
          <SvgXml xml={seeds.left} width={width} height={height} />
        </View>
      )}
      {(rightEarned || showEmpty) && (
        <View style={[styles.seed, { opacity: rightEarned ? 1 : BEAN_EMPTY_OPACITY }]}>
          <SvgXml xml={seeds.right} width={width} height={height} />
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

/** Font styles for a Figma text layer with a 1.1 line height, scaled by `s`. */
function textStyle(size: number, fontFamily: string, s: number) {
  return { fontFamily, fontSize: size * s, lineHeight: size * 1.1 * s };
}

/**
 * Mr. Bean, whose artwork runs 1.1% below its Figma frame; keep the frame
 * height for layout and let the feet hang over.
 */
function MrBean({ width, s }: { width: number; s: number }) {
  const frameHeight = width * (46.865 / 27.603);
  const artHeight = width * (47.377 / 27.603);
  return (
    <View style={{ width: width * s, height: frameHeight * s }}>
      <SvgXml xml={SHARE_HEADER_MR_BEAN_SVG} width={width * s} height={artHeight * s} />
    </View>
  );
}

/** The 'B' + 'EAN' lockup at the given height. */
function Wordmark({ height, gap, s }: { height: number; gap: number; s: number }) {
  return (
    <View style={[styles.row, { gap: gap * s }]}>
      <SvgXml xml={SHARE_HEADER_LOGO_SVG} width={height * (28.779 / 40) * s} height={height * s} />
      <SvgXml xml={SHARE_HEADER_EAN_SVG} width={height * (105.961 / 40) * s} height={height * s} />
    </View>
  );
}

/** The full-size five-bean rating row (Figma 741:14526), unearned beans faded. */
function BeanRow({ seeds, rating, s }: { seeds: Seeds; rating: number; s: number }) {
  return (
    <View
      style={[
        styles.row,
        { gap: 23.433 * s, paddingHorizontal: 31.243 * s, paddingVertical: 23.432 * s },
      ]}
    >
      {[1, 2, 3, 4, 5].map((index) => (
        <ShareBean
          key={index}
          seeds={seeds}
          fill={getFill(index, rating)}
          width={SHARE_BEAN_WIDTH * s}
          height={SHARE_BEAN_HEIGHT * s}
          showEmpty
        />
      ))}
    </View>
  );
}

/** Filled and Transparent — Figma 741:14505 / 741:14580, centred on the story. */
function CenteredCard({ review, s, variant }: { review: Review; s: number; variant: StoryCardVariant }) {
  const seeds = variant === 'filled' ? FILLED_SEEDS : OUTLINE_SEEDS;

  // visit_date is a bare 'YYYY-MM-DD'; parse it literally so the timezone can't
  // shift the day. Reviews don't store a time, so the Figma "at 6:19am" is left out.
  const visit = review.visitDate ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(review.visitDate) : null;
  const day = visit ? Number(visit[3]) : 0;

  return (
    <View style={[styles.content, { gap: 80 * s, paddingVertical: 48 * s }]}>
      {variant === 'filled' ? <Wordmark height={40} gap={4.273} s={s} /> : <MrBean width={27.603} s={s} />}

      <View style={[styles.block, { gap: 16 * s }]}>
        <View style={[styles.row, { gap: 8 * s }]}>
          <Text style={[styles.text, { fontFamily: 'Lato-Black', fontSize: 120 * s, lineHeight: 120 * s }]}>
            {formatRating(review.rating)}
          </Text>
          <Text style={[styles.text, textStyle(16, 'Lato-Light', s)]}>/5</Text>
        </View>
        <Text style={[styles.text, textStyle(24, 'Lato-Regular', s)]}>Rating</Text>
      </View>

      <View style={[styles.block, { gap: 16 * s }]}>
        <Text style={[styles.text, textStyle(32, 'Lato-Regular', s), { maxWidth: 960 * s }]} numberOfLines={2}>
          {review.cafeName}
        </Text>
        <Text style={[styles.text, textStyle(24, 'Lato-Regular', s)]}>Café</Text>
      </View>

      {!!review.orderedItem && (
        <View style={[styles.block, { gap: 16 * s }]}>
          <Text style={[styles.text, textStyle(32, 'Lato-Regular', s), { maxWidth: 960 * s }]} numberOfLines={2}>
            {review.orderedItem}
          </Text>
          <Text style={[styles.text, textStyle(24, 'Lato-Regular', s)]}>Order</Text>
        </View>
      )}

      <View style={[styles.block, { gap: 24 * s, paddingVertical: 23.953 * s }]}>
        <BeanRow seeds={seeds} rating={review.rating} s={s} />

        {visit ? (
          <View style={styles.dateRow}>
            <Text style={[styles.text, textStyle(24, 'Lato-Regular', s)]}>
              {`${MONTHS[Number(visit[2]) - 1]}, ${day}`}
            </Text>
            <Text style={[styles.text, textStyle(12, 'Lato-Regular', s)]}>{ordinalSuffix(day)}</Text>
            <Text style={[styles.text, textStyle(24, 'Lato-Regular', s)]}>{`, ${visit[1]}`}</Text>
          </View>
        ) : (
          <Text style={[styles.text, textStyle(24, 'Lato-Regular', s)]}>{review.date}</Text>
        )}
      </View>
    </View>
  );
}

/**
 * Compact — Figma 741:14068. Sits in the top third of the story and shows only
 * the beans the rating earns (the frame hides the 5th bean at 4/5).
 */
function CompactCard({ review, s }: { review: Review; s: number }) {
  const label = textStyle(28.255, 'Lato-Regular', s);
  const value = textStyle(36.783, 'Lato-Bold', s);
  const earned = [1, 2, 3, 4, 5]
    .map((index) => getFill(index, review.rating))
    .filter((fill) => fill !== 'empty');

  return (
    <View
      style={[
        styles.compact,
        { width: 846 * s, marginTop: 34.811 * s, gap: 37.673 * s, paddingVertical: 25.116 * s },
      ]}
    >
      <MrBean width={21.665} s={s} />

      <View style={[styles.block, { gap: 12.558 * s }]}>
        <Text style={[styles.text, label]}>Cafe</Text>
        <Text style={[styles.text, value, { maxWidth: 846 * s }]} numberOfLines={2}>
          {review.cafeName}
        </Text>
      </View>

      {!!review.orderedItem && (
        <View style={[styles.block, { gap: 12.558 * s }]}>
          <Text style={[styles.text, label]}>Order</Text>
          <Text style={[styles.text, value, { maxWidth: 846 * s }]} numberOfLines={2}>
            {review.orderedItem}
          </Text>
        </View>
      )}

      <View style={[styles.block, { gap: 12.558 * s }]}>
        <Text style={[styles.text, label, styles.cream]}>Rating</Text>
        <View style={[styles.row, { gap: 18.837 * s, paddingVertical: 18.391 * s }]}>
          {earned.map((fill, index) => (
            <ShareBean
              key={index}
              seeds={FILLED_SEEDS}
              fill={fill}
              width={85.826 * s}
              height={97.138 * s}
              showEmpty={false}
            />
          ))}
        </View>
        <Text style={[styles.text, value, styles.cream]}>{`${formatRating(review.rating)}/5`}</Text>
      </View>

      <Wordmark height={18.837} gap={2.012} s={s} />
    </View>
  );
}

/**
 * Simple — Figma 740:13390: the café beside a map pin over the rating beans,
 * signed with the BEAN lockup (added under the beans; not in the Figma frame).
 */
function SimpleCard({ review, s }: { review: Review; s: number }) {
  return (
    <View style={[styles.block, { gap: 24 * s, paddingVertical: 23.953 * s }]}>
      <View style={[styles.row, { gap: 11.977 * s, maxWidth: 960 * s }]}>
        <SvgXml xml={SHARE_MAP_PIN_SVG} width={46.865 * s} height={46.865 * s} />
        <Text
          style={[styles.text, styles.cream, styles.shrink, textStyle(46.865, 'Lato-Bold', s)]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {review.cafeName}
        </Text>
      </View>

      <BeanRow seeds={FILLED_SEEDS} rating={review.rating} s={s} />

      <Wordmark height={40} gap={4.273} s={s} />
    </View>
  );
}

export default function ReviewStoryCard({
  review,
  width,
  variant = 'filled',
}: ReviewStoryCardProps) {
  // Scale factor from the Figma artboard to the requested width, so the preview
  // and the 1080px export stay pixel-identical in proportion.
  const s = width / DESIGN_WIDTH;

  return (
    <View
      style={[
        styles.card,
        { width, height: width / STORY_ASPECT_RATIO },
        variant === 'compact' && styles.cardTop,
      ]}
    >
      {variant === 'compact' ? (
        <CompactCard review={review} s={s} />
      ) : variant === 'simple' ? (
        <SimpleCard review={review} s={s} />
      ) : (
        <CenteredCard review={review} s={s} variant={variant} />
      )}
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
  cardTop: {
    justifyContent: 'flex-start',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  compact: {
    alignItems: 'center',
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
  cream: {
    color: colors.cream,
  },
  shrink: {
    flexShrink: 1,
  },
  seed: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
