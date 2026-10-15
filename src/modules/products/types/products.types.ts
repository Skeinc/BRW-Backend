import type { product } from '../../../database/schema/product.js';
import type { MediaCover, MediaImageView } from '../../media/types/media.types.js';

export type ProductRecord = typeof product.$inferSelect;

export type NewProductValues = typeof product.$inferInsert;

export type ProductPatch = Partial<Omit<NewProductValues, 'id' | 'createdAt' | 'updatedAt'>>;

/** One row of the admin product list. `price` and `oldPrice` are numeric strings such as "1299.00". */
export type ProductListItem = {
  id: string;
  slug: string;
  sku: string | null;
  name: string;
  price: string;
  oldPrice: string | null;
  stockStatus: ProductRecord['stockStatus'];
  isPublished: boolean;
  categoryId: string;
  categoryName: string;
  collectionId: string | null;
  collectionName: string | null;
  cover: MediaCover | null;
  createdAt: Date;
  updatedAt: Date;
};

/** A product with its photos, as returned by the admin API. */
export type ProductView = ProductRecord & {
  images: MediaImageView[];
};

export type ProductListFilters = {
  categoryId?: string;
  collectionId?: string;
  q?: string;
  isPublished?: boolean;
  page: number;
  pageSize: number;
};

export type ProductListRow = Omit<ProductListItem, 'cover'>;

export type ProductListRowsResult = {
  rows: ProductListRow[];
  total: number;
};
