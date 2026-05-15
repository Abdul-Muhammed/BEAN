/*
  # Create Cafe Categories Table

  Stores the selectable cafe preference categories and their SVG icons.
  Category ids remain stable because profiles.preferences stores these ids.
*/

CREATE TABLE IF NOT EXISTS public.cafe_categories (
  id text PRIMARY KEY,
  label text NOT NULL,
  icon_svg_xml text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cafe_categories_display_order
  ON public.cafe_categories(display_order);

CREATE INDEX IF NOT EXISTS idx_cafe_categories_is_active
  ON public.cafe_categories(is_active);

ALTER TABLE public.cafe_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read cafe categories" ON public.cafe_categories;

CREATE POLICY "Anyone can read cafe categories"
  ON public.cafe_categories
  FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_cafe_categories_updated_at ON public.cafe_categories;
CREATE TRIGGER update_cafe_categories_updated_at
  BEFORE UPDATE ON public.cafe_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

INSERT INTO public.cafe_categories (id, label, icon_svg_xml, display_order, is_active)
VALUES
  ('wifi', 'Has WiFi', $svg$<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0M12 20h.01M2 8.5a15 15 0 0 1 20 0" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$, 1, true),
  ('ambient', 'Ambient', $svg$<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v2M18.36 5.64l-1.42 1.42M21 12h-2M18.36 18.36l-1.42-1.42M12 19v2M7.06 16.94l-1.42 1.42M5 12H3M7.06 7.06 5.64 5.64M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$, 2, true),
  ('ethical', 'Ethical', $svg$<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10ZM9 12l2 2 4-5" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$, 3, true),
  ('cozy', 'Cozy', $svg$<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 11a8 8 0 0 1 16 0v5a3 3 0 0 1-3 3h-2v-7h5M4 12h5v7H7a3 3 0 0 1-3-3v-5Z" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$, 4, true),
  ('spacious', 'Spacious', $svg$<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h16v16H4V4Zm4 4h8M8 12h8M8 16h5" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$, 5, true),
  ('quiet', 'Quiet', $svg$<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 5 6 9H3v6h3l5 4V5Zm7 4-4 4M14 9l4 4" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$, 6, true),
  ('outdoor', 'Outdoor Seating', $svg$<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 11h16M7 11l-2 9M17 11l2 9M8 11l4-8 4 8M9 20h6" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$, 7, true),
  ('parking', 'Parking', $svg$<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 20V4h6a5 5 0 0 1 0 10H7M7 14h6" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$, 8, true),
  ('specialty', 'Specialty Coffee', $svg$<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8h11v5a5 5 0 0 1-5 5H9a3 3 0 0 1-3-3V8Zm11 2h1a2 2 0 0 1 0 4h-1M8 4h8M9 21h6" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$, 9, true),
  ('brunch', 'Great Brunch', $svg$<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 10h16M6 10l2 10M18 10l-2 10M8 6h8a4 4 0 0 1 4 4H4a4 4 0 0 1 4-4Zm2-3h4" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$, 10, true),
  ('roastery', 'Local Roastery', $svg$<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 18c-2-2-2-6 0-8 2-2 6-2 8 0 2 2 2 6 0 8-2 2-6 2-8 0ZM9 9c1.5 1.5 1.5 4.5 0 6M15 9c-1.5 1.5-1.5 4.5 0 6" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$, 11, true),
  ('artisan', 'Artisan', $svg$<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2l.9-5.5-4-3.9 5.5-.8L12 3Z" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$, 12, true),
  ('trendy', 'Trendy', $svg$<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 14l4-4 4 4 8-8M4 20h16M16 6h4v4" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$, 13, true),
  ('traditional', 'Traditional', $svg$<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 10l9-7 9 7M5 10v10h14V10M9 20v-6h6v6" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$, 14, true),
  ('vegan', 'Vegan Options', $svg$<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 19c8 0 14-6 14-14-8 0-14 6-14 14Zm0 0c0-5 4-9 9-9" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$, 15, true),
  ('pastries', 'Fresh Pastries', $svg$<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12a7 7 0 0 1 14 0v4a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-4Zm3 0a4 4 0 0 1 8 0M9 7V5M15 7V5" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$, 16, true)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  icon_svg_xml = EXCLUDED.icon_svg_xml,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();
