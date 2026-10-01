export const colors = {
  background: '#FFFEFB',
  surface: '#FFFFFF',
  primary: '#1C1C1E',
  white: '#FFFFFF',
  black: '#000000',
  mutedText: '#8E8E93',
  border: '#F0F0F0',
  warmBorder: '#F2EEE6',
  warmSurface: '#F7F3EC',
  gold: '#D4AF37',
  goldText: '#A37D19',
  disabled: '#E5E5EA',
  disabledText: '#8E8E93',
  danger: '#FF3B30',
  error: '#D32F2F',

  // Figma design-system tokens (Bean (Copy), file ycJFxFhJQq5NFx7l6QMBlY).
  // Additive on purpose: the values above are still what the rest of the app
  // renders with; screens adopt these as they get redesigned.
  ink: '#0F1312',            // Primary
  cream: '#F9F3ED',          // Secondary
  creamBorder: '#F5F1E6',
  heartRed: '#D1495B',       // Heart Red
  separator: '#E3E3E3',      // Grey/Seperator
  slate: '#38443A',
  greyNormal: '#474747',     // Grey/Normal
  greyExtraLight: '#F0F0F0', // Grey/Extra Light
  accent: '#ADAFA4',         // Accent
  accent2: '#C9C3B5',        // Accent 2
  beanFill: '#612B05',       // Bean/Fill
  beanStroke: '#8D3F01',     // Bean/Stroke
  openGreen: '#2CC05E',      // Star Rating, used for "Open Now"
  badgeRed: '#C22938',       // Indicator/Red/Primary
  inputGrey: '#F2F2F2',      // Search input ground
};

export const fonts = {
  body: 'Lato-Regular',
  bodyBold: 'Lato-Bold',
  bodyLight: 'Lato-Light',
  /** Loaded in app/_layout.tsx; the Figma "Title 1" style. */
  black: 'Lato-Black',
  heading: 'OtomanopeeOne-Regular',
};

/**
 * The Figma frames only ever use these four step values, so anything else in a
 * redesigned screen is a mistake rather than a deliberate choice.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  /** Legacy page gutter. The Figma screens use a 360pt content column on a
   *  390pt frame, i.e. md on each side. */
  lg: 20,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  /** Fully rounded pills and avatars. */
  pill: 100,
} as const;

/**
 * The five named text styles in the Figma file. Figma expresses line height as
 * a multiplier; React Native wants absolute points, so the 1.1 styles are
 * pre-multiplied here. A "100%" line height means default, so those styles
 * deliberately omit lineHeight.
 */
export const type = {
  /** Heading 1 — Otomanopee One 16. Section and screen titles. */
  h1: {
    fontFamily: fonts.heading,
    fontSize: 16,
  },
  /** Heading 2 — Otomanopee One 14, tracked in. Sub-section headers. */
  h2: {
    fontFamily: fonts.heading,
    fontSize: 14,
    lineHeight: 15.4,
    letterSpacing: -0.408,
  },
  /** Title 1 — Lato Black 14. Cafe names, button labels, emphasis. */
  title1: {
    fontFamily: fonts.black,
    fontSize: 14,
  },
  /** Body 1 — Lato Regular 14. Default copy. */
  body1: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 15.4,
  },
  /** Footnote 1 — Lato Regular 12. Metadata, captions, counts. */
  footnote1: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 13.2,
  },
} as const;

/** softShadow:1 in Figma — the hero pill and floating badge elevation. */
export const softShadow = {
  shadowColor: '#262626',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.1,
  shadowRadius: 10,
  elevation: 3,
} as const;
