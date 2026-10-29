import type { room } from '../../../database/schema/room.js';
import type { solution } from '../../../database/schema/solution.js';
import type { MediaCover, MediaImageView } from '../../media/types/media.types.js';

export type NewRoomValues = typeof room.$inferInsert;

export type RoomPatch = Partial<Omit<NewRoomValues, 'id' | 'createdAt' | 'updatedAt'>>;

/** Room as returned by the admin list. */
export type RoomView = typeof room.$inferSelect & {
  cover: MediaCover | null;
  solutionCount: number;
};

/** A room with its image gallery. */
export type RoomDetailView = RoomView & {
  images: MediaImageView[];
};

export type NewSolutionValues = typeof solution.$inferInsert;

export type SolutionPatch = Partial<Omit<NewSolutionValues, 'id' | 'createdAt' | 'updatedAt'>>;

/** Row of the admin solutions list. */
export type SolutionRow = typeof solution.$inferSelect & {
  roomName: string;
  collectionName: string;
  productCount: number;
};

/** Solution as returned by the admin list. */
export type SolutionView = SolutionRow & {
  cover: MediaCover | null;
};

/** A solution with its gallery and element products. */
export type SolutionDetailView = SolutionView & {
  images: MediaImageView[];
  products: { id: string; name: string }[];
};
