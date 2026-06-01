/*
  # Purge non-NZ cafe cache data

  Removes stale overseas cafes/results created before cafe searches were hard
  scoped to New Zealand. Search and nearby caches are cheap to rebuild, so clear
  them entirely to avoid returning place_ids/results that reference deleted rows.
*/

DELETE FROM public.text_search_cache;

DELETE FROM public.nearby_places_cache;

DELETE FROM public.cafes c
WHERE NOT (
  (
    c.latitude BETWEEN -47.5 AND -33.8
    AND c.longitude BETWEEN 166.0 AND 179.5
  )
  OR c.formatted_address ILIKE '%new zealand%'
  OR c.formatted_address ILIKE '%, NZ'
  OR c.formatted_address ILIKE '%, NZ,%'
);
