export type PageParams = {
  page: number;
  pageSize: number;
};

export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
