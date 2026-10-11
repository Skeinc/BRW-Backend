import type { product } from '../../database/schema/product.js';
import type { productImage } from '../../database/schema/product-image.js';

export type ProductRecord = typeof product.$inferSelect;

export type NewProduct = typeof product.$inferInsert;

export type ProductImageRecord = typeof productImage.$inferSelect;

export type ProductListRow = ProductRecord & {
  categoryName: string;
  collectionName: string | null;
  coverKey: string | null;
};

export type AdminProductListItem = ProductRecord & {
  categoryName: string;
  collectionName: string | null;
  coverUrl: string | null;
};

export type AdminProductImage = {
  id: string;
  url: string;
  key: string;
  alt: string | null;
  sortOrder: number;
  width: number | null;
  height: number | null;
};

export type AdminProduct = ProductRecord & {
  categoryName: string;
  collectionName: string | null;
  images: AdminProductImage[];
};

export type ProductListFilters = {
  categoryIds?: string[];
  collectionId?: string;
  q?: string;
};
