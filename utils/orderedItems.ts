/** Most items a reviewer can pick for "What did you order?". */
export const MAX_ORDER_ITEMS = 5;

/**
 * Reads the ordered items off a reviews row. New rows carry the ordered_items
 * list; rows written by older builds only have the single ordered_item text.
 */
export function orderedItemsFromRow(row: {
  ordered_items?: string[] | null;
  ordered_item?: string | null;
}): string[] {
  const list = Array.isArray(row.ordered_items)
    ? row.ordered_items.map((s) => s.trim()).filter(Boolean)
    : [];
  if (list.length > 0) return list;
  const single = row.ordered_item?.trim();
  return single ? [single] : [];
}

/**
 * The columns to write for a set of ordered items: the list itself, plus a
 * joined copy in ordered_item for builds that still read the old column.
 */
export function orderedItemsColumns(items: string[] | undefined) {
  const clean = (items ?? []).map((s) => s.trim()).filter(Boolean);
  return {
    ordered_items: clean,
    ordered_item: clean.length > 0 ? clean.join(', ') : null,
  };
}

/** One line for places that show the order as text, e.g. "Latte, Mocha". */
export function formatOrderedItems(items: string[] | undefined): string {
  return (items ?? []).join(', ');
}
