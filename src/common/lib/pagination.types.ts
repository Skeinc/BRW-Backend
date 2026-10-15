/** Paged list response: `{ items, page, pageSize, total }`. */
export type PaginatedResult<TItem> = {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
};
