// Coffee bean rating artwork. Sourced from the two half-bean SVGs in
// assets/images ("coffee bean left.svg" / "coffee bean right.svg"). The files
// have spaces in their names and the project renders SVGs via react-native-svg's
// SvgXml (xml-string) rather than a file transformer, so the markup is inlined
// here. A left half + right half placed side by side form one whole bean; each
// half represents 0.5 of a rating.

export const BEAN_LEFT_SVG = `<svg width="23" height="56" viewBox="0 0 23 56" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13.876 1.03613C15.8618 -0.0605061 17.8073 0.331876 19.2812 1.57715C20.7702 2.83519 21.7743 4.96924 21.7744 7.3125V48.6875C21.7743 51.0308 20.7702 53.1648 19.2812 54.4229C17.8073 55.6681 15.8618 56.0605 13.876 54.9639C11.2406 53.5084 8.8376 51.3703 6.80859 48.665C4.7795 45.9596 3.16644 42.7416 2.06445 39.1943C0.962547 35.6473 0.394531 31.8433 0.394531 28C0.394531 24.1567 0.962547 20.3527 2.06445 16.8057C3.16644 13.2584 4.7795 10.0404 6.80859 7.33496C8.8376 4.6297 11.2406 2.4916 13.876 1.03613Z" fill="#612B05" stroke="#8D3F01" stroke-width="0.7884"/>
</svg>`;

export const BEAN_RIGHT_SVG = `<svg width="23" height="56" viewBox="0 0 23 56" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8.29297 1.03613C6.30715 -0.0605061 4.36162 0.331876 2.8877 1.57715C1.39875 2.83519 0.394653 4.96924 0.394531 7.3125V48.6875C0.394653 51.0308 1.39875 53.1648 2.8877 54.4229C4.36162 55.6681 6.30715 56.0605 8.29297 54.9639C10.9283 53.5084 13.3313 51.3703 15.3604 48.665C17.3894 45.9596 19.0025 42.7416 20.1045 39.1943C21.2064 35.6473 21.7744 31.8433 21.7744 28C21.7744 24.1567 21.2064 20.3527 20.1045 16.8057C19.0025 13.2584 17.3894 10.0404 15.3604 7.33496C13.3313 4.6297 10.9283 2.4916 8.29297 1.03613Z" fill="#612B05" stroke="#8D3F01" stroke-width="0.7884"/>
</svg>`;

// Each source SVG is 23 wide × 56 tall. Width of one half relative to its height.
export const BEAN_HALF_RATIO = 23 / 56;

// Opacity used to render an unfilled (empty) bean half — a faded brown.
export const BEAN_EMPTY_OPACITY = 0.2;
