/*
  # Additional cafe categories

  Extends the seeded taxonomy with the dietary/use-case cases the original 16
  missed. Ids are stable and permanent: profiles.preferences, reviews.attributes
  and cafe_category_tags all key off them.

  Icons follow the existing house style exactly — 16x16 box, viewBox 0 0 24 24,
  stroke #0F1312, stroke-width 2, round caps and joins — so they sit correctly
  next to the originals in the filter sheet and the review form.
*/

INSERT INTO public.cafe_categories (id, label, icon_svg_xml, display_order, is_active)
VALUES
  ('halal', 'Halal', $svg$<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$, 17, true),
  ('study', 'Study Friendly', $svg$<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3H3Z" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$, 18, true),
  ('dog', 'Dog Friendly', $svg$<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM6 13a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm16 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm-10 8c-2.5 0-4.5-1.6-4.5-3.6C7.5 15.4 9.5 13 12 13s4.5 2.4 4.5 4.4c0 2-2 3.6-4.5 3.6Z" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$, 19, true),
  ('glutenfree', 'Gluten Free', $svg$<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21V9m0 0c0-2 1.5-4 3.5-4 0 2-1.5 4-3.5 4Zm0 0c0-2-1.5-4-3.5-4 0 2 1.5 4 3.5 4Zm0 5c0-2 1.5-4 3.5-4 0 2-1.5 4-3.5 4Zm0 0c0-2-1.5-4-3.5-4 0 2 1.5 4 3.5 4ZM4 4l16 16" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$, 20, true)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  icon_svg_xml = EXCLUDED.icon_svg_xml,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();
