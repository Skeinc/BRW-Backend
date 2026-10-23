import type { CategoryBreadcrumb, CategoryRecord } from '../types/categories.types.js';

/** The path from the root category down to the category with `id`, inclusive. */
export function buildCategoryBreadcrumbs({
  records,
  id,
}: {
  records: CategoryRecord[];
  id: string;
}): CategoryBreadcrumb[] {
  const recordsById = new Map(records.map((record) => [record.id, record]));
  const path: CategoryBreadcrumb[] = [];
  let current: CategoryRecord | undefined = recordsById.get(id);
  while (current !== undefined) {
    path.unshift({ id: current.id, slug: current.slug, name: current.name });
    current = current.parentId === null ? undefined : recordsById.get(current.parentId);
  }
  return path;
}
