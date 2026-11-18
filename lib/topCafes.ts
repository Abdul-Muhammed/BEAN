import { supabase } from './supabase';

/** The fields a Top Cafes tile needs for a cafe the user hasn't reviewed. */
export interface CafeSummary {
  cafeId: string;
  cafeName: string;
  cafeImage: string | null;
}

/**
 * Looks up name and thumbnail for cafes by place_id from public.cafes (readable
 * by anyone). Every cafe the Top Cafes editor can offer came through the
 * search-cafes function, which upserts its results there, so a hand-picked cafe
 * the user hasn't reviewed can still be drawn. Unknown ids are simply absent
 * from the result.
 */
export async function fetchCafesByIds(ids: string[]): Promise<Map<string, CafeSummary>> {
  const result = new Map<string, CafeSummary>();
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return result;

  const { data, error } = await supabase
    .from('cafes')
    .select('place_id, name, thumbnail_url')
    .in('place_id', unique);

  if (error) {
    console.warn('Failed to load top cafes:', error.message);
    return result;
  }

  for (const row of data ?? []) {
    result.set(row.place_id, {
      cafeId: row.place_id,
      cafeName: row.name ?? 'Cafe',
      cafeImage: row.thumbnail_url ?? null,
    });
  }
  return result;
}
