import { supabase } from './supabase';
import type { Cafe } from '../data/mockData';

/** One attribute a cafe carries, with how many distinct people reported it. */
export interface CafeAttribute {
  /** cafe_categories id, e.g. "pet". */
  attributeId: string;
  votes: number;
}

/** A row from the cafes_by_attributes lookup. */
export interface AttributeCafeRow {
  attribute: string;
  place_id: string;
  name: string | null;
  formatted_address: string | null;
  rating: number | null;
  latitude: number | null;
  longitude: number | null;
  thumbnail_url: string | null;
  votes: number;
  distance_meters: number | null;
}

/**
 * Attributes for a set of cafes, keyed by cafe id.
 *
 * One query for everything currently on screen rather than one per card. The
 * source is the cafe_attribute_counts view, so it reflects review edits and
 * deletions immediately. Returns an empty map rather than throwing, because a
 * missing chip row should never take a screen down.
 */
export async function getAttributesForCafes(
  cafeIds: string[]
): Promise<Map<string, CafeAttribute[]>> {
  const byCafe = new Map<string, CafeAttribute[]>();
  const unique = Array.from(new Set(cafeIds.filter(Boolean)));
  if (unique.length === 0) return byCafe;

  const { data, error } = await supabase
    .from('cafe_attribute_counts')
    .select('cafe_id, attribute, votes')
    .in('cafe_id', unique);

  if (error) {
    console.warn('Failed to load cafe attributes:', error.message);
    return byCafe;
  }

  (data ?? []).forEach((row: any) => {
    const list = byCafe.get(row.cafe_id) ?? [];
    list.push({ attributeId: row.attribute, votes: row.votes });
    byCafe.set(row.cafe_id, list);
  });

  // Most-agreed first, so a card showing only two chips shows the two the most
  // people reported.
  byCafe.forEach((list) => list.sort((a, b) => b.votes - a.votes));

  return byCafe;
}

/**
 * Cafes carrying any of the given attribute ids, nearest first.
 *
 * Deliberately has no distance cap: a cafe across town surfaces only when
 * nothing closer carries the attribute. Entirely a Supabase call, so this adds
 * no Google Places usage however many sections the Home feed renders.
 */
export async function getCafesByAttributes(
  attributeIds: string[],
  options: {
    latitude?: number | null;
    longitude?: number | null;
    minVotes?: number;
    limitPer?: number;
  } = {}
): Promise<AttributeCafeRow[]> {
  const attributes = Array.from(new Set(attributeIds.filter(Boolean)));
  if (attributes.length === 0) return [];

  const { latitude, longitude, minVotes = 1, limitPer = 3 } = options;

  const { data, error } = await supabase.rpc('cafes_by_attributes', {
    p_attributes: attributes,
    p_lat: typeof latitude === 'number' ? latitude : null,
    p_lng: typeof longitude === 'number' ? longitude : null,
    p_min_votes: minVotes,
    p_limit_per: limitPer,
  });

  if (error) {
    console.warn('Failed to load cafes by attribute:', error.message);
    return [];
  }

  return (data ?? []) as AttributeCafeRow[];
}

/**
 * Shape an attribute lookup row like the rest of the app's cafes so the normal
 * cards and the cafe screen can render it. Details such as hours and photos are
 * filled in lazily when the cafe is opened.
 */
export function attributeRowToCafe(row: AttributeCafeRow): Cafe {
  return {
    id: row.place_id,
    place_id: row.place_id,
    name: row.name ?? 'Cafe',
    location: row.formatted_address ?? '',
    rating: typeof row.rating === 'number' ? row.rating : 0,
    image: row.thumbnail_url ?? '',
    description: '',
    reviews: [],
    photos: row.thumbnail_url ? [row.thumbnail_url] : [],
    latitude: typeof row.latitude === 'number' ? row.latitude : undefined,
    longitude: typeof row.longitude === 'number' ? row.longitude : undefined,
  };
}
