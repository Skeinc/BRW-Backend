import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, ilike, inArray, max, sql, type SQL } from 'drizzle-orm';
import { buildContainsPattern } from '../../../common/lib/build-contains-pattern.js';
import { DRIZZLE } from '../../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../../database/drizzle.types.js';
import { collection } from '../../../database/schema/collection.js';
import { product } from '../../../database/schema/product.js';
import { room } from '../../../database/schema/room.js';
import { solution } from '../../../database/schema/solution.js';
import { solutionProduct } from '../../../database/schema/solution-product.js';
import type { NewSolutionValues, SolutionPatch, SolutionRow } from '../types/admin-rooms.types.js';

/** Filters of the admin solutions list; every one is optional. */
export type SolutionFilters = {
  q?: string;
  roomId?: string;
  collectionId?: string;
};

/** Drizzle queries of the admin side for solutions and their element products. */
@Injectable()
export class AdminSolutionsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /** One page of solutions with room and collection names, newest sort order first within a room. */
  async findPage({
    filters,
    page,
    pageSize,
  }: {
    filters: SolutionFilters;
    page: number;
    pageSize: number;
  }): Promise<{ rows: SolutionRow[]; total: number }> {
    const where: SQL | undefined = this.buildWhere(filters);
    const rows: SolutionRow[] = await this.selectRows()
      .where(where)
      .orderBy(asc(room.sortOrder), asc(collection.name), asc(solution.sortOrder), asc(solution.name))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const [totalRow] = await this.db.select({ total: count() }).from(solution).where(where);
    return { rows, total: totalRow.total };
  }

  /** One solution with room and collection names, or undefined. */
  async findRowById(id: string): Promise<SolutionRow | undefined> {
    const [row] = await this.selectRows().where(eq(solution.id, id));
    return row;
  }

  /** Element products of a solution in display order. */
  async findProducts(solutionId: string): Promise<{ id: string; name: string }[]> {
    return this.db
      .select({ id: product.id, name: product.name })
      .from(solutionProduct)
      .innerJoin(product, eq(product.id, solutionProduct.productId))
      .where(eq(solutionProduct.solutionId, solutionId))
      .orderBy(asc(solutionProduct.sortOrder));
  }

  /** Ids out of `ids` that exist in the given table. */
  async findExistingIds({
    table,
    ids,
  }: {
    table: 'room' | 'collection' | 'product';
    ids: string[];
  }): Promise<string[]> {
    if (ids.length === 0) {
      return [];
    }
    const source = { room, collection, product }[table];
    const rows = await this.db.select({ id: source.id }).from(source).where(inArray(source.id, ids));
    return rows.map((row) => row.id);
  }

  /** Sort order that puts a solution after the existing ones of its room. */
  async nextSortOrder(roomId: string): Promise<number> {
    const [row] = await this.db
      .select({ last: max(solution.sortOrder) })
      .from(solution)
      .where(eq(solution.roomId, roomId));
    return (row.last ?? -1) + 1;
  }

  /** Inserts a solution with its element products in one transaction and returns its id. */
  async insert({ values, productIds }: { values: NewSolutionValues; productIds: string[] }): Promise<string> {
    return this.db.transaction(async (tx) => {
      const [record] = await tx.insert(solution).values(values).returning({ id: solution.id });
      await this.writeProducts({ tx, solutionId: record.id, productIds });
      return record.id;
    });
  }

  /** Updates a solution and, when `productIds` is given, replaces its element products. */
  async update({ id, patch, productIds }: { id: string; patch: SolutionPatch; productIds?: string[] }): Promise<void> {
    await this.db.transaction(async (tx) => {
      if (Object.keys(patch).length > 0) {
        await tx.update(solution).set(patch).where(eq(solution.id, id));
      }
      if (productIds !== undefined) {
        await tx.delete(solutionProduct).where(eq(solutionProduct.solutionId, id));
        await this.writeProducts({ tx, solutionId: id, productIds });
      }
    });
  }

  /** Deletes a solution; its element links go with it. */
  async delete(id: string): Promise<void> {
    await this.db.delete(solution).where(eq(solution.id, id));
  }

  private selectRows() {
    return this.db
      .select({
        id: solution.id,
        roomId: solution.roomId,
        collectionId: solution.collectionId,
        name: solution.name,
        description: solution.description,
        price: solution.price,
        sortOrder: solution.sortOrder,
        isPublished: solution.isPublished,
        createdAt: solution.createdAt,
        updatedAt: solution.updatedAt,
        roomName: room.name,
        collectionName: collection.name,
        productCount: sql<number>`(select count(*)::int from ${solutionProduct} where ${solutionProduct.solutionId} = ${solution.id})`,
      })
      .from(solution)
      .innerJoin(room, eq(room.id, solution.roomId))
      .innerJoin(collection, eq(collection.id, solution.collectionId));
  }

  private buildWhere({ q, roomId, collectionId }: SolutionFilters): SQL | undefined {
    const conditions: SQL[] = [];
    if (q !== undefined && q.trim() !== '') {
      conditions.push(ilike(solution.name, buildContainsPattern(q.trim())));
    }
    if (roomId !== undefined) {
      conditions.push(eq(solution.roomId, roomId));
    }
    if (collectionId !== undefined) {
      conditions.push(eq(solution.collectionId, collectionId));
    }
    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  private async writeProducts({
    tx,
    solutionId,
    productIds,
  }: {
    tx: Pick<DrizzleDatabase, 'insert'>;
    solutionId: string;
    productIds: string[];
  }): Promise<void> {
    if (productIds.length === 0) {
      return;
    }
    await tx
      .insert(solutionProduct)
      .values(productIds.map((productId, sortOrder) => ({ solutionId, productId, sortOrder })));
  }
}
