import { Inject, Injectable } from '@nestjs/common';
import { asc, count, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';
import { collection } from '../../database/schema/collection.js';
import { product } from '../../database/schema/product.js';
import type { CollectionRecord, NewCollection } from './collections.types.js';

@Injectable()
export class CollectionsRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly database: DrizzleDatabase,
  ) {}

  async findAll(): Promise<CollectionRecord[]> {
    return this.database.select().from(collection).orderBy(asc(collection.sortOrder), asc(collection.name));
  }

  async findById(id: string): Promise<CollectionRecord | undefined> {
    const [row] = await this.database.select().from(collection).where(eq(collection.id, id));
    return row;
  }

  async findBySlug(slug: string): Promise<CollectionRecord | undefined> {
    const [row] = await this.database.select().from(collection).where(eq(collection.slug, slug));
    return row;
  }

  async create(values: NewCollection): Promise<CollectionRecord> {
    const [row] = await this.database.insert(collection).values(values).returning();
    return row;
  }

  async update({ id, values }: { id: string; values: Partial<NewCollection> }): Promise<CollectionRecord> {
    const [row] = await this.database.update(collection).set(values).where(eq(collection.id, id)).returning();
    return row;
  }

  async delete(id: string): Promise<void> {
    await this.database.delete(collection).where(eq(collection.id, id));
  }

  /**
   * Products that belong to the collection (read-only; products are owned by the products module).
   */
  async countProducts(id: string): Promise<number> {
    const [row] = await this.database.select({ total: count() }).from(product).where(eq(product.collectionId, id));
    return row.total;
  }

  /**
   * Product count per collection id, for the collections that have at least one product.
   */
  async countProductsByCollection(): Promise<Map<string, number>> {
    const rows = await this.database
      .select({ collectionId: product.collectionId, total: count() })
      .from(product)
      .groupBy(product.collectionId);
    return new Map(rows.flatMap((row) => (row.collectionId ? [[row.collectionId, row.total] as const] : [])));
  }
}
