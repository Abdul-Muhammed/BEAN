// Bean mark for the onboarding loading animation. Sourced from the three
// frames in assets/images/loading_animation/. All three files contain the
// *same* path — only the fill differs (#ADAFA4 grey -> #0F1312 near-black), and
// Frame2 is simply that path on a canvas cropped to 103/189 of the width.
//
// So rather than three assets, the path lives here once with the colour
// parameterised: OnboardingLoadingAnimation layers a dark copy over a grey one
// and animates the clip boundary, which reproduces Frame2 and every state
// between it continuously.
//
// The project renders SVGs via react-native-svg's SvgXml (xml-string) rather
// than a file transformer, so the markup is inlined here — same pattern as
// constants/savedScreenIcons.ts.

export const BEAN_GREY = '#ADAFA4';
export const BEAN_DARK = '#0F1312';

/** Native dimensions of the frame assets; use these to preserve the aspect. */
export const BEAN_VIEWBOX_WIDTH = 189;
export const BEAN_VIEWBOX_HEIGHT = 289;

const BEAN_PATH =
  'M100.687 274.092C74.2962 283.845 45.6104 288.722 14.6298 288.722C8.89266 217.581 2.29486 102.121 0 0C32.128 4.016 17.068 33.9926 45.18 49.4829C73.8658 64.9732 144.576 92.2245 161.788 114.026C179.573 135.253 188.465 157.054 188.465 179.429C188.465 200.083 180.433 218.729 164.369 235.366C148.305 251.43 127.078 264.339 100.687 274.092Z';

/** The bean mark at a given fill colour, sized to fill its SvgXml container. */
export function beanFillSvg(fill: string): string {
  return `<svg width="100%" height="100%" viewBox="0 0 ${BEAN_VIEWBOX_WIDTH} ${BEAN_VIEWBOX_HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="${BEAN_PATH}" fill="${fill}"/>
</svg>`;
}
