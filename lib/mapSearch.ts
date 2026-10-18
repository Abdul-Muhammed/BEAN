import { supabase } from './supabase';
import type { Cafe } from '../data/mockData';
import type { CafeAttribute } from './cafeAttributes';
import { DEFAULT_CAFE_IMAGE, isNzPlace } from '../services/googlePlaces';

/**
 * Client side of the cafes_in_bbox / search_cafes RPCs.
 *
 * Both read only Supabase tables, so neither can cost Google Places usage. The
 * shapes follow Airbnb's map search: one request per settled map move returns
 * lean pins for every cafe in view plus one page of full cards for the list,
 * and the client says which cards it already holds so they aren't resent.
 */

export type PinTier = 'full' | 'mini';

export interface MapPin {
  place_id: string;
  name: string | null;
  latitude: number;
  longitude: number;
  rating: number | null;
  pin_tier: PinTier;
}

export interface CafeCard {
  place_id: string;
  name: string | null;
  formatted_address: string | null;
  rating: number | null;
  latitude: number | null;
  longitude: number | null;
  thumbnail_url: string | null;
  distance_meters: number | null;
  attributes: { attribute: string; votes: number }[];
}

export interface Bbox {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export interface BboxPage {
  pins: MapPin[];
  /** Full cards in list order, already hydrated from the card store. */
  list: CafeCard[];
  total: number;
  nextCursor: number | null;
}

// ---------------------------------------------------------------------------
// Card store
// ---------------------------------------------------------------------------

// Every card the server has sent this session, by id. Lets cafes_in_bbox reply
// with just an id for cards we hold (Airbnb's skipHydrationListingIds) and lets
// any screen turn an id back into a full card without another request.
const cardStore = new Map<string, CafeCard>();
const MAX_KNOWN_IDS = 300;

export function rememberCards(cards: CafeCard[]): void {
  cards.forEach((card) => cardStore.set(card.place_id, card));
}

export function getCard(placeId: string): CafeCard | undefined {
  return cardStore.get(placeId);
}

/** Most recently stored ids, capped so the request body stays small. */
function knownIds(): string[] {
  const ids = Array.from(cardStore.keys());
  return ids.length > MAX_KNOWN_IDS ? ids.slice(ids.length - MAX_KNOWN_IDS) : ids;
}

// ---------------------------------------------------------------------------
// Viewport snapping
// ---------------------------------------------------------------------------

/**
 * Grow a bbox outward to a grid whose cell size follows the zoom, so small pans
 * produce the same box (and the same React Query key) and are served from the
 * cache with no request. The snapped box always contains the visible one.
 */
export function snapBbox(bbox: Bbox): Bbox {
  const span = Math.max(bbox.neLat - bbox.swLat, bbox.neLng - bbox.swLng, 0.0005);
  // Grid of half the visible span, rounded to a power of two so nearby zooms
  // share cells.
  const cell = 2 ** Math.floor(Math.log2(span / 2));
  const round = (v: number) => Math.round(v * 1e6) / 1e6;
  return {
    swLat: round(Math.floor(bbox.swLat / cell) * cell),
    swLng: round(Math.floor(bbox.swLng / cell) * cell),
    neLat: round(Math.ceil(bbox.neLat / cell) * cell),
    neLng: round(Math.ceil(bbox.neLng / cell) * cell),
  };
}

export function bboxFromRegion(region: {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}): Bbox {
  return {
    swLat: region.latitude - region.latitudeDelta / 2,
    swLng: region.longitude - region.longitudeDelta / 2,
    neLat: region.latitude + region.latitudeDelta / 2,
    neLng: region.longitude + region.longitudeDelta / 2,
  };
}

/** Approximate Google-style zoom level for a region's longitude span. */
export function zoomForLongitudeDelta(longitudeDelta: number): number {
  return Math.log2(360 / Math.max(longitudeDelta, 1e-6));
}

// ---------------------------------------------------------------------------
// RPCs
// ---------------------------------------------------------------------------

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function parseCard(raw: any): CafeCard {
  return {
    place_id: raw.place_id,
    name: raw.name ?? null,
    formatted_address: raw.formatted_address ?? null,
    rating: toNumber(raw.rating),
    latitude: toNumber(raw.latitude),
    longitude: toNumber(raw.longitude),
    thumbnail_url: raw.thumbnail_url ?? null,
    distance_meters: toNumber(raw.distance_meters),
    attributes: Array.isArray(raw.attributes) ? raw.attributes : [],
  };
}

export async function fetchCafesInBbox(
  bbox: Bbox,
  options: {
    attributes?: string[];
    cursor?: number;
    listLimit?: number;
    includePins?: boolean;
    signal?: AbortSignal;
  } = {}
): Promise<BboxPage> {
  const { attributes = [], cursor = 0, listLimit = 20, includePins = true, signal } = options;

  let request = supabase.rpc('cafes_in_bbox', {
    p_sw_lat: bbox.swLat,
    p_sw_lng: bbox.swLng,
    p_ne_lat: bbox.neLat,
    p_ne_lng: bbox.neLng,
    p_attributes: attributes,
    p_cursor: cursor,
    p_list_limit: listLimit,
    p_known_ids: knownIds(),
    p_include_pins: includePins,
  });
  if (signal) request = request.abortSignal(signal);

  const { data, error } = await request;
  if (error) throw new Error(error.message);

  const payload = (data ?? {}) as any;
  const pins: MapPin[] = (Array.isArray(payload.pins) ? payload.pins : [])
    .map((p: any) => ({
      place_id: p.place_id,
      name: p.name ?? null,
      latitude: toNumber(p.latitude),
      longitude: toNumber(p.longitude),
      rating: toNumber(p.rating),
      pin_tier: p.pin_tier === 'full' ? 'full' : 'mini',
    }))
    .filter(
      (p: any): p is MapPin =>
        p.latitude !== null && p.longitude !== null && isNzPlace(p)
    );

  const rawList: any[] = Array.isArray(payload.list) ? payload.list : [];
  rememberCards(rawList.filter((c) => !c.known).map(parseCard));
  const list = rawList
    .map((c) => cardStore.get(c.place_id))
    .filter((c): c is CafeCard => !!c && isNzPlace(c));

  return {
    pins,
    list,
    total: toNumber(payload.total) ?? 0,
    nextCursor: toNumber(payload.next_cursor),
  };
}

export async function searchCafesInDb(
  query: string,
  options: { latitude?: number | null; longitude?: number | null; signal?: AbortSignal } = {}
): Promise<CafeCard[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  let request = supabase.rpc('search_cafes', {
    p_q: term,
    p_lat: typeof options.latitude === 'number' ? options.latitude : null,
    p_lng: typeof options.longitude === 'number' ? options.longitude : null,
    p_limit: 20,
  });
  if (options.signal) request = request.abortSignal(options.signal);

  const { data, error } = await request;
  if (error) throw new Error(error.message);

  const cards = ((data ?? []) as any[]).map(parseCard).filter(isNzPlace);
  // Search rows carry no attributes; don't let them overwrite a stored card
  // that has them.
  rememberCards(cards.filter((card) => !cardStore.has(card.place_id)));
  return cards;
}

// ---------------------------------------------------------------------------
// Shaping
// ---------------------------------------------------------------------------

/** A card in the app-wide Cafe shape, for the shared cards and the cafe screen. */
export function cardToCafe(card: CafeCard): Cafe {
  const image = card.thumbnail_url || DEFAULT_CAFE_IMAGE;
  return {
    id: card.place_id,
    place_id: card.place_id,
    name: card.name ?? 'Cafe',
    location: card.formatted_address ?? '',
    rating: card.rating ?? 0,
    image,
    description: card.formatted_address ? `A cafe located at ${card.formatted_address}.` : '',
    reviews: [],
    photos: [image],
    latitude: card.latitude ?? undefined,
    longitude: card.longitude ?? undefined,
  };
}

export function cardAttributes(card: CafeCard): CafeAttribute[] {
  return card.attributes.map((a) => ({ attributeId: a.attribute, votes: a.votes }));
}
