import { supabase, type Database } from './supabase';

export type CafeCategory = Pick<
  Database['public']['Tables']['cafe_categories']['Row'],
  'id' | 'label' | 'icon_svg_xml' | 'display_order'
>;

export async function getCafeCategories(): Promise<CafeCategory[]> {
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
