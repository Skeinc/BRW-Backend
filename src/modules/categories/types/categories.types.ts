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
