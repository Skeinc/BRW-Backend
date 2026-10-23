import type { MediaCover, MediaImageView } from '../../media/types/media.types.js';
import type { collection } from '../../../database/schema/collection.js';

export type CollectionRecord = typeof collection.$inferSelect;

export type NewCollectionValues = typeof collection.$inferInsert;

export type CollectionPatch = Partial<Omit<NewCollectionValues, 'id' | 'createdAt' | 'updatedAt'>>;

/** Collection as returned by the admin API. */
export type CollectionView = CollectionRecord & {
  productCount: number;
  cover: MediaCover | null;
};

/** Id and name of a collection, for pickers. */
export type CollectionOption = Pick<CollectionRecord, 'id' | 'name'>;

/** A collection with its full image gallery. */
export type CollectionDetailView = CollectionView & {
  images: MediaImageView[];
};

/** A published collection in the storefront list. */
export type PublicCollectionItem = Pick<CollectionRecord, 'id' | 'slug' | 'name'> & {
  imageUrl: string | null;
  productCount: number;
};

/** A published collection with its texts and breadcrumbs (the collection itself). */
export type PublicCollectionDetail = PublicCollectionItem &
  Pick<CollectionRecord, 'description' | 'seoTitle' | 'seoDescription'> & {
    breadcrumbs: Pick<CollectionRecord, 'id' | 'slug' | 'name'>[];
  };
