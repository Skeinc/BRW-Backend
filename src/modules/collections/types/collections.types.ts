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
