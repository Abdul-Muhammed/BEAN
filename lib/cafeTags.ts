import { supabase } from './supabase';

/** One community tag on a cafe: a `cafe_categories.id` plus how many distinct
 *  people applied it in a review. */
export interface CafeTag {
  id: string;
  count: number;
}

/**
 * Community tags for one cafe, strongest first.
 *
 * `cafe_category_tags` is public-read (same policy shape as `cafes` and
 * `cafe_categories`), so this is a plain client query — no Edge Function and no
 * Google call. The list endpoints already return tags inline via `cafes_nearby`;
 * this covers the detail screen, which loads through `cafe-details`.
 */
export async function getCafeTags(placeId: string): Promise<CafeTag[]> {
  if (!placeId) return [];

  const { data, error } = await supabase
    .from('cafe_category_tags')
    .select('category_id, vote_count')
    .eq('place_id', placeId)
    .order('vote_count', { ascending: false });

  if (error) {
    console.warn('Failed to load cafe tags:', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.category_id as string,
    count: row.vote_count as number,
  }));
}
