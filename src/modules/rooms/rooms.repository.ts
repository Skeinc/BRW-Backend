import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';
import { collection } from '../../database/schema/collection.js';
import { product } from '../../database/schema/product.js';
import { room } from '../../database/schema/room.js';
import { solution } from '../../database/schema/solution.js';
import { solutionProduct } from '../../database/schema/solution-product.js';
import type { CollectionRecord, RoomRecord, SolutionRecord, SolutionRef } from './types/rooms.types.js';

/** Product row of a solution element. */
export type SolutionElementRow = {
  solutionId: string;
  id: string;
  name: string;
  price: string;
  oldPrice: string | null;
};

/** Read-only Drizzle queries of the storefront for rooms and their solutions. */
@Injectable()
export class RoomsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /** Published rooms in sort order. */
  async findPublishedRooms(): Promise<RoomRecord[]> {
    return this.db.select().from(room).where(eq(room.isPublished, true)).orderBy(asc(room.sortOrder), asc(room.name));
  }

  /** One room by id, or undefined. */
  async findRoomById(id: string): Promise<RoomRecord | undefined> {
    const [record] = await this.db.select().from(room).where(eq(room.id, id));
    return record;
  }

  /** One collection by id, or undefined. */
  async findCollectionById(id: string): Promise<CollectionRecord | undefined> {
    const [record] = await this.db.select().from(collection).where(eq(collection.id, id));
    return record;
  }

  /** Published solutions of published collections, in sort order; optionally only those of one room. */
  async findPublishedSolutionRefs(roomId?: string): Promise<SolutionRef[]> {
    return this.db
      .select({
        id: solution.id,
        roomId: solution.roomId,
        collectionId: solution.collectionId,
        sortOrder: solution.sortOrder,
      })
      .from(solution)
      .innerJoin(collection, eq(collection.id, solution.collectionId))
      .where(
        and(
          eq(solution.isPublished, true),
          eq(collection.isPublished, true),
          roomId === undefined ? undefined : eq(solution.roomId, roomId),
        ),
      )
      .orderBy(asc(solution.sortOrder), asc(solution.name));
  }

  /** Published collections by ids, in sort order. */
  async findPublishedCollections(ids: string[]): Promise<CollectionRecord[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.db
      .select()
      .from(collection)
      .where(and(inArray(collection.id, ids), eq(collection.isPublished, true)))
      .orderBy(asc(collection.sortOrder), asc(collection.name));
  }

  /** Published solutions of one collection in one room, in sort order. */
  async findPublishedSolutions({
    roomId,
    collectionId,
  }: {
    roomId: string;
    collectionId: string;
  }): Promise<SolutionRecord[]> {
    return this.db
      .select()
      .from(solution)
      .where(and(eq(solution.roomId, roomId), eq(solution.collectionId, collectionId), eq(solution.isPublished, true)))
      .orderBy(asc(solution.sortOrder), asc(solution.name));
  }

  /** Published products that are elements of the given solutions, in element order. */
  async findElements(solutionIds: string[]): Promise<SolutionElementRow[]> {
    if (solutionIds.length === 0) {
      return [];
    }
    return this.db
      .select({
        solutionId: solutionProduct.solutionId,
        id: product.id,
        name: product.name,
        price: product.price,
        oldPrice: product.oldPrice,
      })
      .from(solutionProduct)
      .innerJoin(product, eq(product.id, solutionProduct.productId))
      .where(and(inArray(solutionProduct.solutionId, solutionIds), eq(product.isPublished, true)))
      .orderBy(asc(solutionProduct.sortOrder), asc(product.name));
  }
}
