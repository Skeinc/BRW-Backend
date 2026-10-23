import type { AnalyticsCategoryRow, CategoryRevenueRow } from '../types/analytics.types.js';

const ROOT_DEPTH = 1;

function compareByRevenueDesc(a: CategoryRevenueRow, b: CategoryRevenueRow): number {
  return Number(b.revenue) - Number(a.revenue);
}

/** Puts flat category rows into tree order: the best roots first, each followed by its best children. */
export function buildCategoryRows(rows: CategoryRevenueRow[]): AnalyticsCategoryRow[] {
  const childrenByParent = new Map<string | null, CategoryRevenueRow[]>();
  for (const row of rows) {
    childrenByParent.set(row.parentId, [...(childrenByParent.get(row.parentId) ?? []), row]);
  }
  const walk = (parentId: string | null, depth: number): AnalyticsCategoryRow[] =>
    (childrenByParent.get(parentId) ?? [])
      .toSorted(compareByRevenueDesc)
      .flatMap((row) => [{ id: row.id, name: row.name, depth, revenue: row.revenue }, ...walk(row.id, depth + 1)]);
  return walk(null, ROOT_DEPTH);
}
