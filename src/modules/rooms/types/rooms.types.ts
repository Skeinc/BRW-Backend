import type { collection } from '../../../database/schema/collection.js';
import type { room } from '../../../database/schema/room.js';
import type { solution } from '../../../database/schema/solution.js';
import type { MediaCoverImage } from '../../media/types/media.types.js';

export type RoomRecord = typeof room.$inferSelect;

export type SolutionRecord = typeof solution.$inferSelect;

export type CollectionRecord = typeof collection.$inferSelect;

/** Published solution with the id of its collection, to group solutions into collection cards. */
export type SolutionRef = Pick<SolutionRecord, 'id' | 'roomId' | 'collectionId' | 'sortOrder'>;

/** A product element of a solution as the storefront shows it. */
export type PublicSolutionProduct = {
  id: string;
  name: string;
  price: string;
  oldPrice: string | null;
  image: MediaCoverImage | null;
};

/** A ready-made solution with its photos and elements. */
export type PublicSolution = Pick<SolutionRecord, 'id' | 'name' | 'description' | 'price'> & {
  images: MediaCoverImage[];
  products: PublicSolutionProduct[];
};

/** A room card of the home page and the room list. */
export type PublicRoomItem = Pick<RoomRecord, 'id' | 'name'> & {
  imageUrl: string | null;
  collectionCount: number;
};

/** A collection card inside a room; the photo is the first solution picture of the collection in that room. */
export type PublicRoomCollection = Pick<CollectionRecord, 'id' | 'name'> & {
  imageUrl: string | null;
  solutionCount: number;
};

/** A published room with the collections that have solutions in it. */
export type PublicRoomDetail = PublicRoomItem &
  Pick<RoomRecord, 'description' | 'seoTitle' | 'seoDescription'> & {
    collections: PublicRoomCollection[];
  };

/** A collection inside a room: its text and the ready-made solutions of that room. */
export type PublicRoomCollectionDetail = {
  room: Pick<RoomRecord, 'id' | 'name'>;
  collection: Pick<CollectionRecord, 'id' | 'name' | 'description' | 'seoTitle' | 'seoDescription'>;
  solutions: PublicSolution[];
};
