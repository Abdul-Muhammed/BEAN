// Glyph-only SVGs for the map cafe markers. The project renders SVGs via
// react-native-svg's SvgXml (xml-string) rather than a file transformer, so the
// markup is inlined here (same pattern as constants/savedScreenIcons.ts).
//
// Unlike the badges in savedScreenIcons.ts, these carry NO background rect — the
// marker pill supplies its own background/border. Each glyph keeps the fill it
// needs to read against its kind's pill colour.

// Bean glyph from assets/images/map_icons/full-bean.svg (paths only, #612B05).
export const BEAN_MARKER_SVG = `<svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M3.46875 0.258789C3.96524 -0.015413 4.45181 0.0831795 4.82031 0.394531C5.1925 0.709052 5.44333 1.24236 5.44336 1.82812V12.1719C5.44333 12.7576 5.1925 13.2909 4.82031 13.6055C4.45181 13.9168 3.96524 14.0154 3.46875 13.7412C2.8099 13.3773 2.2094 12.8424 1.70215 12.166C1.19491 11.4897 0.79111 10.6856 0.515625 9.79883C0.24014 8.91206 0.0986328 7.96085 0.0986328 7C0.0986328 6.03915 0.24014 5.08794 0.515625 4.20117C0.79111 3.31442 1.19491 2.51032 1.70215 1.83398C2.2094 1.15765 2.8099 0.622669 3.46875 0.258789Z" fill="#612B05" stroke="#8D3F01" stroke-width="0.1971"/>
<path d="M8.00977 0.258789C7.51328 -0.015413 7.0267 0.0831795 6.6582 0.394531C6.28601 0.709052 6.03519 1.24236 6.03516 1.82812V12.1719C6.03519 12.7576 6.28601 13.2909 6.6582 13.6055C7.0267 13.9168 7.51328 14.0154 8.00977 13.7412C8.66862 13.3773 9.26911 12.8424 9.77637 12.166C10.2836 11.4897 10.6874 10.6856 10.9629 9.79883C11.2384 8.91206 11.3799 7.96085 11.3799 7C11.3799 6.03915 11.2384 5.08794 10.9629 4.20117C10.6874 3.31442 10.2836 2.51032 9.77637 1.83398C9.26911 1.15765 8.66862 0.622669 8.00977 0.258789Z" fill="#612B05" stroke="#8D3F01" stroke-width="0.1971"/>
</svg>`;

// Heart glyph extracted from FAVORITES_SVG in constants/savedScreenIcons.ts,
// re-centred to a 14x14 viewBox around the glyph (#D1495B).
export const HEART_MARKER_SVG = `<svg width="14" height="14" viewBox="9 5 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M16 9.12971C14.6667 6.00008 10 6.33341 10 10.3334C10 14.3335 16 17.6669 16 17.6669C16 17.6669 22 14.3335 22 10.3334C22 6.33341 17.3333 6.00008 16 9.12971Z" fill="#D1495B" stroke="#D1495B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Bookmark glyph extracted from BOOKMARKS_SVG in constants/savedScreenIcons.ts,
// re-centred to a 14x14 viewBox around the glyph (fill #ADAFA4, stroke #0F1312).
export const SAVED_MARKER_SVG = `<svg width="14" height="14" viewBox="9 5 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12 8.79997V15.1234C12 16.0308 12 16.4844 12.1361 16.762C12.3883 17.2766 12.941 17.5723 13.5091 17.4968C13.8156 17.456 14.1931 17.2043 14.9481 16.701L14.9499 16.6998C15.2491 16.5003 15.3988 16.4005 15.5553 16.3452C15.8428 16.2436 16.1565 16.2436 16.444 16.3452C16.6009 16.4007 16.7511 16.5008 17.0515 16.7011C17.8065 17.2044 18.1844 17.4559 18.4909 17.4967C19.059 17.5722 19.6117 17.2766 19.8639 16.762C20 16.4844 20 16.0306 20 15.1234V8.79778C20 8.0525 20 7.67931 19.8548 7.39437C19.727 7.14349 19.5225 6.93966 19.2716 6.81183C18.9864 6.6665 18.6135 6.6665 17.8668 6.6665H14.1335C13.3867 6.6665 13.0131 6.6665 12.7279 6.81183C12.477 6.93966 12.2732 7.14349 12.1453 7.39437C12 7.67958 12 8.05323 12 8.79997Z" fill="#ADAFA4" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export type MarkerKind = 'default' | 'favorite' | 'saved';

export interface MarkerPalette {
  bg: string;
  border: string;
  text: string;
  icon: string;
}

export const MARKER_PALETTE: Record<MarkerKind, MarkerPalette> = {
  default: { bg: '#FFCDAB', border: '#612B05', text: '#612B05', icon: BEAN_MARKER_SVG },
  favorite: { bg: '#FFBFC8', border: '#D1495B', text: '#D1495B', icon: HEART_MARKER_SVG },
  saved: { bg: '#FFFEFB', border: '#0F1312', text: '#0F1312', icon: SAVED_MARKER_SVG },
};
