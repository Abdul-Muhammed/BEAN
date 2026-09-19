import type { Cafe } from '../data/mockData';
import type { CafeCategory } from './cafeCategories';

export interface CafeSection {
  /** cafe_categories id, or "near-me" for the leading section. */
  id: string;
  title: string;
  cafes: Cafe[];
}

/** How many cards a section shows before deferring to Discover. */
export const SECTION_CARD_LIMIT = 3;

/** A section is only worth a band once it has more than one cafe in it. */
const MIN_SECTION_SIZE = 2;

/**
 * Google Places types that stand in for a preference category.
 *
 * Only a few categories have an equivalent in the Places taxonomy. The rest are
 * subjective ("Cozy", "Trendy", "Quiet") or simply absent, and are matched by
 * amenity label alone, which today means they match nothing. Sections with no
 * matches are dropped, so an unmatched preference costs nothing on screen.
 */
const CATEGORY_PLACE_TYPES: Record<string, string[]> = {
  pastries: ['bakery'],
  brunch: ['breakfast_restaurant', 'brunch_restaurant'],
  vegan: ['vegan_restaurant', 'vegetarian_restaurant'],
  specialty: ['coffee_shop'],
};

function matchesCategory(cafe: Cafe, category: CafeCategory): boolean {
  // determineAmenities() emits category labels verbatim ("Has WiFi",
  // "Parking"), so an exact label hit is the strongest signal available.
  if (cafe.amenities?.includes(category.label)) return true;

  const placeTypes = CATEGORY_PLACE_TYPES[category.id];
  if (placeTypes && cafe.types?.some((t) => placeTypes.includes(t))) return true;

  return false;
}

/**
 * Build the Home feed's sections from a single nearby result set.
 *
 * "Near Me" always leads. After it comes one section per preference the user
 * chose during onboarding, in the catalogue's display order, containing the
 * nearby cafes that match it. Nothing here issues a network request: every
 * section is a slice of the cafes already fetched, which keeps Home at one
 * Places call per load no matter how many preferences are set.
 */
export function buildHomeSections(
  cafes: Cafe[],
  categories: CafeCategory[],
  preferenceIds: string[]
): CafeSection[] {
  if (cafes.length === 0) return [];

  const sections: CafeSection[] = [
    { id: 'near-me', title: 'Near Me', cafes: cafes.slice(0, SECTION_CARD_LIMIT) },
  ];

  const chosen = new Set(preferenceIds);
  const leadIds = new Set(sections[0].cafes.map((c) => c.id));

  categories
    .filter((category) => chosen.has(category.id))
    .forEach((category) => {
      // Prefer cafes that are not already on screen in "Near Me", so a section
      // adds something rather than repeating the first three cards.
      const matches = cafes.filter((cafe) => matchesCategory(cafe, category));
      const fresh = matches.filter((cafe) => !leadIds.has(cafe.id));
      const picked = (fresh.length >= MIN_SECTION_SIZE ? fresh : matches).slice(
        0,
        SECTION_CARD_LIMIT
      );

      if (picked.length >= MIN_SECTION_SIZE) {
        sections.push({ id: category.id, title: category.label, cafes: picked });
      }
    });

  return sections;
}
