import { Inject, Injectable } from '@nestjs/common';
import { asc, count, eq, max } from 'drizzle-orm';
import type { SortOrderChange } from '../../../common/lib/reorder-items.js';
import { DRIZZLE } from '../../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../../database/drizzle.types.js';
import { room } from '../../../database/schema/room.js';
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
}
