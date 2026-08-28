import { supabase, type Database } from './supabase';

export type CafeCategory = Pick<
  Database['public']['Tables']['cafe_categories']['Row'],
  'id' | 'label' | 'icon_svg_xml' | 'display_order'
>;

// The taxonomy is a small, seeded, effectively-static table, but it is read by
// the review form, the filter sheet, onboarding, the profile, the diary entry
// and every cafe card. Without this, a cold home -> discover -> review flow
// fires the same query half a dozen times. One in-flight promise is shared by
// all callers and the resolved list is reused for the rest of the session.
let cachedCategories: CafeCategory[] | null = null;
let inFlight: Promise<CafeCategory[]> | null = null;

async function fetchCafeCategories(): Promise<CafeCategory[]> {
  const { data, error } = await supabase
    .from('cafe_categories')
    .select('id, label, icon_svg_xml, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to load cafe categories: ${error.message}`);
  }

  return data ?? [];
}

export async function getCafeCategories(): Promise<CafeCategory[]> {
  if (cachedCategories) return cachedCategories;

  if (!inFlight) {
    inFlight = fetchCafeCategories()
      .then((categories) => {
        cachedCategories = categories;
        return categories;
      })
      .finally(() => {
        // Clear either way so a failed load can be retried rather than
        // permanently returning the rejected promise.
        inFlight = null;
      });
  }

  return inFlight;
}

/** Category lookup keyed by id, for turning a stored id back into a label+icon. */
export async function getCafeCategoryMap(): Promise<Map<string, CafeCategory>> {
  const categories = await getCafeCategories();
  return new Map(categories.map((category) => [category.id, category]));
}
