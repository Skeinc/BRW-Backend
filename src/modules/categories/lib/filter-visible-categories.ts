import type { CategoryRecord } from '../types/categories.types.js';

/** Keeps the published categories whose whole chain of parents is published too. */
export function filterVisibleCategories(records: CategoryRecord[]): CategoryRecord[] {
  const recordsById = new Map(records.map((record) => [record.id, record]));
  const isVisible = (record: CategoryRecord): boolean => {
    let current: CategoryRecord | undefined = record;
    while (current !== undefined) {
      if (!current.isPublished) {
        return false;
      }
      current = current.parentId === null ? undefined : recordsById.get(current.parentId);
    }
    return true;
  };
  return records.filter(isVisible);
}
