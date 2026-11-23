import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, inArray, max, sql, type SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../../database/drizzle.types.js';
import { room } from '../../../database/schema/room.js';
import { roomCollection } from '../../../database/schema/room-collection.js';
import { solution } from '../../../database/schema/solution.js';
import type { RoomCollectionLink } from '../types/admin-rooms.types.js';
import type { RoomRecord } from '../types/rooms.types.js';

/** Narrows the links to one room and/or one collection; both are optional. */
export type RoomCollectionFilter = {
  roomId?: string;
  collectionId?: string;
};

/** Drizzle queries of the admin side for `room_collection`: which collections a room shows and in what order. */
@Injectable()
export class AdminRoomCollectionsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /** Links with their solution counts, by room order and then by the place of the collection in the room. */
  async findLinks({ roomId, collectionId }: RoomCollectionFilter = {}): Promise<RoomCollectionLink[]> {
    const pair: SQL = sql`${solution.roomId} = ${roomCollection.roomId} and ${solution.collectionId} = ${roomCollection.collectionId}`;
    return this.db
      .select({
        roomId: roomCollection.roomId,
        collectionId: roomCollection.collectionId,
        solutionCount: sql<number>`(select count(*)::int from ${solution} where ${pair})`,
        publishedSolutionCount: sql<number>`(select count(*)::int from ${solution} where ${pair} and ${solution.isPublished})`,
      })
      .from(roomCollection)
      .innerJoin(room, eq(room.id, roomCollection.roomId))
      .where(
        and(
          roomId === undefined ? undefined : eq(roomCollection.roomId, roomId),
          collectionId === undefined ? undefined : eq(roomCollection.collectionId, collectionId),
        ),
      )
      .orderBy(asc(room.sortOrder), asc(room.name), asc(roomCollection.sortOrder));
  }

  /** One room by id, or undefined. */
  async findRoomById(id: string): Promise<RoomRecord | undefined> {
    const [record] = await this.db.select().from(room).where(eq(room.id, id));
    return record;
  }

  /** Number of the given room ids that exist. */
  async countExistingRooms(ids: string[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }
    const [row] = await this.db.select({ total: count() }).from(room).where(inArray(room.id, ids));
    return row.total;
  }

  /** Unlinks a collection from `removedRoomIds` and appends it to the end of each of `addedRoomIds`, in one transaction (a room is locked so two appends cannot take the same place). */
  async replaceRoomsOfCollection({
    collectionId,
    removedRoomIds,
    addedRoomIds,
  }: {
    collectionId: string;
    removedRoomIds: string[];
    addedRoomIds: string[];
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      if (removedRoomIds.length > 0) {
        await tx
          .delete(roomCollection)
          .where(and(eq(roomCollection.collectionId, collectionId), inArray(roomCollection.roomId, removedRoomIds)));
      }
      for (const roomId of addedRoomIds) {
        await tx.select({ id: room.id }).from(room).where(eq(room.id, roomId)).for('update');
        const [row] = await tx
          .select({ last: max(roomCollection.sortOrder) })
          .from(roomCollection)
          .where(eq(roomCollection.roomId, roomId));
        await tx.insert(roomCollection).values({ roomId, collectionId, sortOrder: (row.last ?? -1) + 1 });
      }
    });
  }

  /** Numbers the collections of a room in the order of `collectionIds`, in one transaction. */
  async applyCollectionOrder({ roomId, collectionIds }: { roomId: string; collectionIds: string[] }): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const [sortOrder, collectionId] of collectionIds.entries()) {
        await tx
          .update(roomCollection)
          .set({ sortOrder })
          .where(and(eq(roomCollection.roomId, roomId), eq(roomCollection.collectionId, collectionId)));
      }
    });
  }
}
