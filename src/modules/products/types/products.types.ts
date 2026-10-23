import type { product } from '../../../database/schema/product.js';
import type { MediaCover, MediaCoverImage, MediaImageView } from '../../media/types/media.types.js';

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

/** A reason to look at a product again, shown as a health counter on the analytics page. */
export type ProductIssue = 'out_of_stock' | 'no_photo' | 'no_collection' | 'not_ordered';

export type ProductListFilters = {
  categoryId?: string;
  collectionId?: string;
  q?: string;
  isPublished?: boolean;
  issue?: ProductIssue;
  page: number;
  pageSize: number;
};

export type ProductListRow = Omit<ProductListItem, 'cover'>;

export type ProductListRowsResult = {
  rows: ProductListRow[];
  total: number;
};

export type PublicProductSort = 'price_asc' | 'price_desc' | 'new' | 'popular';

/** Storefront filters. `category` and `collection` are slugs; a category includes its subcategories. */
export type PublicProductFilters = {
  category?: string;
  collection?: string;
  q?: string;
  priceMin?: string;
  priceMax?: string;
  material?: string[];
  colorBody?: string[];
  colorFacade?: string[];
  inStock?: boolean;
  hit?: boolean;
};

/** A filter that a facet leaves out when it counts its own values. */
export type PublicProductFilterKey = 'category' | 'collection' | 'price' | 'material' | 'colorBody' | 'colorFacade';

export type NamedRef = {
  id: string;
  slug: string;
  name: string;
};

/** One card of the storefront product list. Prices are numeric strings. */
export type PublicProductListItem = {
  id: string;
  slug: string;
  name: string;
  sku: string | null;
  price: string;
  oldPrice: string | null;
  discountPercent: number | null;
  isHit: boolean;
  stockStatus: ProductRecord['stockStatus'];
  coverImage: MediaCoverImage | null;
  category: NamedRef;
  collection: NamedRef | null;
};

export type PublicProductRow = Omit<PublicProductListItem, 'coverImage' | 'discountPercent'>;

export type PublicProductRowsResult = {
  rows: PublicProductRow[];
  total: number;
};

export type FacetValue = {
  value: string;
  count: number;
};

export type ProductFacets = {
  price: { min: string | null; max: string | null };
  collections: { slug: string; name: string; count: number }[];
  materials: FacetValue[];
  colorsBody: FacetValue[];
  colorsFacade: FacetValue[];
};

/** A published product with its photos, category path and collection. */
export type PublicProductDetail = Pick<
  ProductRecord,
  | 'id'
  | 'slug'
  | 'sku'
  | 'name'
  | 'description'
  | 'price'
  | 'oldPrice'
  | 'stockStatus'
  | 'widthMm'
  | 'heightMm'
  | 'heightMaxMm'
  | 'depthMm'
  | 'lengthMm'
  | 'material'
  | 'colorBody'
  | 'colorFacade'
  | 'attributes'
  | 'isHit'
  | 'seoTitle'
  | 'seoDescription'
> & {
  discountPercent: number | null;
  images: MediaImageView[];
  category: NamedRef;
  collection: NamedRef | null;
  breadcrumbs: Pick<NamedRef, 'id' | 'slug' | 'name'>[];
};

export type PublicProductDetailRow = {
  record: ProductRecord;
  category: NamedRef;
  collection: NamedRef | null;
};
