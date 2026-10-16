import { Inject, Injectable } from '@nestjs/common';
import { asc, count, eq, max } from 'drizzle-orm';
import type { SortOrderChange } from '../../common/lib/reorder-items.js';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';
import { collection } from '../../database/schema/collection.js';
import { product } from '../../database/schema/product.js';
import type { CollectionPatch, CollectionRecord, NewCollectionValues } from './types/collections.types.js';

/** Drizzle queries for the `collection` table (plus read-only product counts). */
@Injectable()
export class CollectionsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /** All collections ordered by sort order and name. */
  async findAll(): Promise<CollectionRecord[]> {
    return this.db.select().from(collection).orderBy(asc(collection.sortOrder), asc(collection.name));
  }

  /** Sort order that puts a collection after the existing ones. */
  async nextSortOrder(): Promise<number> {
    const [row] = await this.db.select({ last: max(collection.sortOrder) }).from(collection);
    return (row.last ?? -1) + 1;
  }

  /** Saves new sort orders in one transaction. */
  async applySortOrders(changes: SortOrderChange[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const change of changes) {
        await tx.update(collection).set({ sortOrder: change.sortOrder }).where(eq(collection.id, change.id));
      }
    });
  }

  /** Finds one row by id, or undefined when it does not exist. */
  async findById(id: string): Promise<CollectionRecord | undefined> {
    const [record] = await this.db.select().from(collection).where(eq(collection.id, id));
    return record;
  }

  /** Finds one row by slug, or undefined when it does not exist. */
  async findBySlug(slug: string): Promise<CollectionRecord | undefined> {
    const [record] = await this.db.select().from(collection).where(eq(collection.slug, slug));
    return record;
  }

  /** Inserts a row and returns it. */
  async insert(values: NewCollectionValues): Promise<CollectionRecord> {
    const [record] = await this.db.insert(collection).values(values).returning();
    return record;
  }

  /** Updates a row by id and returns it. */
  async update({ id, patch }: { id: string; patch: CollectionPatch }): Promise<CollectionRecord> {
    const [record] = await this.db.update(collection).set(patch).where(eq(collection.id, id)).returning();
    return record;
  }

  /** Deletes a row by id. */
  async delete(id: string): Promise<void> {
    await this.db.delete(collection).where(eq(collection.id, id));
  }

  /** Read-only: number of products in a collection. */
  async countProducts(id: string): Promise<number> {
    const [row] = await this.db.select({ total: count() }).from(product).where(eq(product.collectionId, id));
    return row.total;
  }

  /** Read-only: product counts per collection id (collections without products are absent). */
  async countProductsByCollection(): Promise<Map<string, number>> {
    const rows = await this.db
      .select({ collectionId: product.collectionId, total: count() })
      .from(product)
      .groupBy(product.collectionId);
    return new Map(rows.flatMap((row) => (row.collectionId === null ? [] : [[row.collectionId, row.total] as const])));
  }
}
