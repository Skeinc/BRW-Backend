import { Inject, Injectable } from '@nestjs/common';
import { asc, count, eq, isNull, max } from 'drizzle-orm';
import type { SortOrderChange } from '../../common/lib/reorder-items.js';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';
import { category } from '../../database/schema/category.js';
import { product } from '../../database/schema/product.js';
import type { CategoryPatch, CategoryRecord, NewCategoryValues } from './types/categories.types.js';

/** Drizzle queries for the `category` table (plus read-only product counts). */
@Injectable()
export class CategoriesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /** All categories ordered by sort order and name. */
  async findAll(): Promise<CategoryRecord[]> {
    return this.db.select().from(category).orderBy(asc(category.sortOrder), asc(category.name));
  }

  /** Sort order that puts a category after the existing children of `parentId` (null for the top level). */
  async nextSortOrder(parentId: string | null): Promise<number> {
    const [row] = await this.db
      .select({ last: max(category.sortOrder) })
      .from(category)
      .where(parentId === null ? isNull(category.parentId) : eq(category.parentId, parentId));
    return (row.last ?? -1) + 1;
  }

  /** Saves new sort orders in one transaction. */
  async applySortOrders(changes: SortOrderChange[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const change of changes) {
        await tx.update(category).set({ sortOrder: change.sortOrder }).where(eq(category.id, change.id));
      }
    });
  }

  /** Finds one row by id, or undefined when it does not exist. */
  async findById(id: string): Promise<CategoryRecord | undefined> {
    const [record] = await this.db.select().from(category).where(eq(category.id, id));
    return record;
  }

  /** Finds one row by slug, or undefined when it does not exist. */
  async findBySlug(slug: string): Promise<CategoryRecord | undefined> {
    const [record] = await this.db.select().from(category).where(eq(category.slug, slug));
    return record;
  }

  /** Inserts a row and returns it. */
  async insert(values: NewCategoryValues): Promise<CategoryRecord> {
    const [record] = await this.db.insert(category).values(values).returning();
    return record;
  }

  /** Updates a row by id and returns it. */
  async update({ id, patch }: { id: string; patch: CategoryPatch }): Promise<CategoryRecord> {
    const [record] = await this.db.update(category).set(patch).where(eq(category.id, id)).returning();
    return record;
  }

  /** Deletes a row by id. */
  async delete(id: string): Promise<void> {
    await this.db.delete(category).where(eq(category.id, id));
  }

  /** Number of direct child categories. */
  async countChildren(id: string): Promise<number> {
    const [row] = await this.db.select({ total: count() }).from(category).where(eq(category.parentId, id));
    return row.total;
  }

  /** Read-only: number of products directly in a category. */
  async countProducts(id: string): Promise<number> {
    const [row] = await this.db.select({ total: count() }).from(product).where(eq(product.categoryId, id));
    return row.total;
  }

  /** Read-only: product counts per category id (categories without products are absent). */
  async countProductsByCategory(): Promise<Map<string, number>> {
    const rows = await this.db
      .select({ categoryId: product.categoryId, total: count() })
      .from(product)
      .groupBy(product.categoryId);
    return new Map(rows.map((row) => [row.categoryId, row.total]));
  }
}
