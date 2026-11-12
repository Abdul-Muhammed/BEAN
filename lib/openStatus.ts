import { supabase } from './supabase';

/**
 * Live open/closed for a set of cafes, from the cafe_open_status RPC.
 *
 * Worked out on the server in New Zealand time from the stored weekly hours,
 * so it is current even when the cafes themselves came from a cached list.
 * Cafes we have no hours for are absent from the map, or map to null. Returns
 * an empty map on failure: the Open Now filter then keeps every cafe, which is
 * what it does for unknown hours anyway.
 */
export async function getOpenStatus(placeIds: string[]): Promise<Map<string, boolean | null>> {
  const status = new Map<string, boolean | null>();
  const unique = Array.from(new Set(placeIds.filter(Boolean)));
  if (unique.length === 0) return status;

  const { data, error } = await supabase.rpc('cafe_open_status', { p_place_ids: unique });
  if (error) {
    console.warn('Failed to load open status:', error.message);
    return status;
  }

  ((data ?? []) as { place_id: string; open_now: boolean | null }[]).forEach((row) => {
    status.set(row.place_id, typeof row.open_now === 'boolean' ? row.open_now : null);
  });
  return status;
}
