import type { PaginatedResult } from './pagination.types.js';

type BuildPaginatedResultInput<TItem> = {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * Wraps one page of rows with its paging metadata.
 */
export function buildPaginatedResult<TItem>({
  items,
  page,
  pageSize,
  total,
}: BuildPaginatedResultInput<TItem>): PaginatedResult<TItem> {
  return { items, page, pageSize, total };
}
