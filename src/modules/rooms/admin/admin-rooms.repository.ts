import { Inject, Injectable } from '@nestjs/common';
import { asc, count, eq, inArray, max } from 'drizzle-orm';
import type { SortOrderChange } from '../../../common/lib/reorder-items.js';
import { DRIZZLE } from '../../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../../database/drizzle.types.js';
import { collection } from '../../../database/schema/collection.js';
import { room } from '../../../database/schema/room.js';
import { roomCollection } from '../../../database/schema/room-collection.js';
import { solution } from '../../../database/schema/solution.js';
import type { RoomRecord } from '../types/rooms.types.js';
import type { NewRoomValues, RoomPatch } from '../types/admin-rooms.types.js';

/** Drizzle queries of the admin side for the `room` table. */
@Injectable()
export class AdminRoomsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /** All rooms by sort order, then by name. */
  async findAll(): Promise<RoomRecord[]> {
    return this.db.select().from(room).orderBy(asc(room.sortOrder), asc(room.name));
  }

  /** Number of solutions per room id. */
  async countSolutions(): Promise<Map<string, number>> {
    const rows = await this.db
      .select({ roomId: solution.roomId, total: count() })
      .from(solution)
      .groupBy(solution.roomId);
    return new Map(rows.map((row) => [row.roomId, row.total]));
  }

  /** Sort order that puts a room after the existing ones. */
  async nextSortOrder(): Promise<number> {
    const [row] = await this.db.select({ last: max(room.sortOrder) }).from(room);
    return (row.last ?? -1) + 1;
  }

  /** Saves new sort orders in one transaction. */
  async applySortOrders(changes: SortOrderChange[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const change of changes) {
        await tx.update(room).set({ sortOrder: change.sortOrder }).where(eq(room.id, change.id));
      }
    });
  }

  /** Finds one row by id, or undefined when it does not exist. */
  async findById(id: string): Promise<RoomRecord | undefined> {
    const [record] = await this.db.select().from(room).where(eq(room.id, id));
    return record;
  }

  /** Inserts a row and returns it. */
  async insert(values: NewRoomValues): Promise<RoomRecord> {
    const [record] = await this.db.insert(room).values(values).returning();
    return record;
  }

  /** Updates a row by id and returns it. */
  async update({ id, patch }: { id: string; patch: RoomPatch }): Promise<RoomRecord> {
    const [record] = await this.db.update(room).set(patch).where(eq(room.id, id)).returning();
    return record;
  }

  /** Number of solutions in one room. */
  async countSolutionsOf(id: string): Promise<number> {
    const [row] = await this.db.select({ total: count() }).from(solution).where(eq(solution.roomId, id));
    return row.total;
  }

  /** Deletes a row by id. */
  async delete(id: string): Promise<void> {
    await this.db.delete(room).where(eq(room.id, id));
  }

  /** Ids of the linked collections per room id, in display order. */
  async findAllCollectionIds(): Promise<Map<string, string[]>> {
    const rows = await this.db
      .select({ roomId: roomCollection.roomId, collectionId: roomCollection.collectionId })
      .from(roomCollection)
      .orderBy(asc(roomCollection.sortOrder));
    return rows.reduce((byRoom, row) => {
      byRoom.set(row.roomId, [...(byRoom.get(row.roomId) ?? []), row.collectionId]);
      return byRoom;
    }, new Map<string, string[]>());
  }

  /** Ids of the collections linked to a room, in display order. */
  async findCollectionIds(roomId: string): Promise<string[]> {
    const rows = await this.db
      .select({ collectionId: roomCollection.collectionId })
      .from(roomCollection)
      .where(eq(roomCollection.roomId, roomId))
      .orderBy(asc(roomCollection.sortOrder));
    return rows.map((row) => row.collectionId);
  }

  /** Number of the given collection ids that exist. */
  async countExistingCollections(ids: string[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }
    const [row] = await this.db.select({ total: count() }).from(collection).where(inArray(collection.id, ids));
    return row.total;
  }

  /** Replaces the collections linked to a room; their order is the order of `collectionIds`. */
  async replaceCollections({ roomId, collectionIds }: { roomId: string; collectionIds: string[] }): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(roomCollection).where(eq(roomCollection.roomId, roomId));
      if (collectionIds.length > 0) {
        await tx
          .insert(roomCollection)
          .values(collectionIds.map((collectionId, sortOrder) => ({ roomId, collectionId, sortOrder })));
      }
    });
  }
}
