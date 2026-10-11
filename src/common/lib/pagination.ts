import type { Page, PageParams } from './pagination.types.js';

/**
 * Number of rows to skip for a 1-based page.
 */
export function toOffset({ page, pageSize }: PageParams): number {
  return (page - 1) * pageSize;
}

/**
 * Wraps one page of rows with its paging metadata.
 */
export function toPage<T>({ items, total, params }: { items: T[]; total: number; params: PageParams }): Page<T> {
  return { items, page: params.page, pageSize: params.pageSize, total };
}
