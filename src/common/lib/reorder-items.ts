/** New sort order of one item. */
export type SortOrderChange = {
  id: string;
  sortOrder: number;
};

type MoveItemInput<TItem extends { id: string }> = {
  items: readonly TItem[];
  id: string;
  overId: string;
};

/**
 * `items` with `id` placed at the position `overId` had; the items in between shift by one, in either
 * direction. Unknown ids or `id === overId` leave the order unchanged.
 */
export function moveItem<TItem extends { id: string }>({ items, id, overId }: MoveItemInput<TItem>): TItem[] {
  const from: number = items.findIndex((item) => item.id === id);
  const to: number = items.findIndex((item) => item.id === overId);
  const reordered: TItem[] = [...items];
  if (from < 0 || to < 0 || from === to) {
    return reordered;
  }
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);
  return reordered;
}

/** Sort orders 0, 1, 2, ... for the items in the given order; only items whose current value differs are listed. */
export function planSortOrders(ordered: ReadonlyArray<{ id: string; sortOrder: number }>): SortOrderChange[] {
  return ordered.flatMap((item, index) => (item.sortOrder === index ? [] : [{ id: item.id, sortOrder: index }]));
}
