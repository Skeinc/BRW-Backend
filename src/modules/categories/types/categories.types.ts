import type { MediaCover, MediaImageView } from '../../media/types/media.types.js';
import type { category } from '../../../database/schema/category.js';

export type CategoryRecord = typeof category.$inferSelect;

export type NewCategoryValues = typeof category.$inferInsert;

export type CategoryPatch = Partial<Omit<NewCategoryValues, 'id' | 'createdAt' | 'updatedAt'>>;

/** Category as returned by the admin API; `depth` starts at 1 for root categories. */
export type CategoryView = CategoryRecord & {
  depth: number;
  /** Number of direct subcategories. */
  childCount: number;
  productCount: number;
  cover: MediaCover | null;
};

/** A category in the tree before covers are attached. */
export type CategoryNode = Omit<CategoryView, 'cover'>;

/** A category with its full image gallery. */
export type CategoryDetailView = CategoryView & {
  images: MediaImageView[];
};

/** A published category in the storefront tree; `productCount` includes published products of every subcategory. */
export type PublicCategoryNode = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  productCount: number;
  children: PublicCategoryNode[];
};

/** One step of the path from the root to a category. */
export type CategoryBreadcrumb = Pick<CategoryRecord, 'id' | 'slug' | 'name'>;

/** A published category with its subtree and the path from the root. */
export type PublicCategoryDetail = PublicCategoryNode & {
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  breadcrumbs: CategoryBreadcrumb[];
};
