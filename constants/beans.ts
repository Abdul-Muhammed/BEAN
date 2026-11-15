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

// Single-bean rating mark beside "X.X" scores, from
// assets/images/share/filled_cracked_ bean.svg (the share-style bean in brand
// brown). Figma exported it as `<use>` refs inside a `<mask>`, which
// react-native-svg renders unreliably; its inside stroke is the same colour as
// the fill, so the two seed shapes alone draw the same picture.
export const CRACKED_BEAN_SVG = `<svg width="11" height="12" viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M3.23814 11.0182C3.18946 11.4799 2.77273 11.8126 2.31177 11.7578C2.04266 11.7259 1.80593 11.5649 1.6772 11.3265L0.61635 9.36122C-0.0305885 8.16276 -0.174945 6.75639 0.215038 5.4515L0.698314 3.83445C1.03569 2.70557 1.73012 1.71656 2.67735 1.01588L3.3721 0.501974C3.6882 0.26815 4.06046 0.121975 4.45121 0.0782422L5.06932 0.00906254C5.7403 -0.0660348 6.37433 0.33189 6.59846 0.968774C6.67131 1.17579 6.69622 1.39663 6.67132 1.61467L6.56122 2.57883C6.42796 3.74581 5.93556 4.84259 5.15205 5.71765L4.33391 6.63139C3.86733 7.15248 3.57675 7.8073 3.50339 8.50289L3.23814 11.0182Z" fill="#612B05"/>
<path d="M7.71946 0.833444C7.81045 0.290515 8.3567 -0.049803 8.88415 0.107832C9.1794 0.196071 9.41043 0.426967 9.49883 0.722168L10.3366 3.51958C10.5574 4.25707 10.6419 5.02867 10.5857 5.79647L10.4893 7.11609C10.3813 8.59304 9.65173 9.95483 8.48196 10.863L8.03555 11.2095C7.58573 11.5587 7.0501 11.7802 6.48502 11.8507L5.38097 11.9884C4.77833 12.0636 4.18972 11.7685 3.88944 11.2406C3.65974 10.8368 3.6298 10.3494 3.80836 9.92055L4.61191 7.99052C4.8298 7.46717 5.12369 6.9788 5.48408 6.54119L6.50077 5.30667C6.88651 4.83828 7.14236 4.27671 7.24266 3.67827L7.71946 0.833444Z" fill="#612B05"/>
</svg>`;

/** Width of the cracked bean relative to its height. */
export const CRACKED_BEAN_RATIO = 11 / 12;
