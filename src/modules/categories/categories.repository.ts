import { Inject, Injectable } from '@nestjs/common';
import { asc, count, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';
import { category } from '../../database/schema/category.js';
import { product } from '../../database/schema/product.js';
import type { CategoryNode, CategoryRecord, NewCategory } from './categories.types.js';

@Injectable()
export class CategoriesRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly database: DrizzleDatabase,
  ) {}

  async findAll(): Promise<CategoryRecord[]> {
    return this.database.select().from(category).orderBy(asc(category.sortOrder), asc(category.name));
  }

  async findAllNodes(): Promise<CategoryNode[]> {
    return this.database.select({ id: category.id, parentId: category.parentId }).from(category);
  }

  async findById(id: string): Promise<CategoryRecord | undefined> {
    const [row] = await this.database.select().from(category).where(eq(category.id, id));
    return row;
  }

  async findBySlug(slug: string): Promise<CategoryRecord | undefined> {
    const [row] = await this.database.select().from(category).where(eq(category.slug, slug));
    return row;
  }

  async create(values: NewCategory): Promise<CategoryRecord> {
    const [row] = await this.database.insert(category).values(values).returning();
    return row;
  }

  async update({ id, values }: { id: string; values: Partial<NewCategory> }): Promise<CategoryRecord> {
    const [row] = await this.database.update(category).set(values).where(eq(category.id, id)).returning();
    return row;
  }

  async delete(id: string): Promise<void> {
    await this.database.delete(category).where(eq(category.id, id));
  }

  async countChildren(id: string): Promise<number> {
    const [row] = await this.database.select({ total: count() }).from(category).where(eq(category.parentId, id));
    return row.total;
  }

  /**
   * Products whose own category is exactly `id` (read-only; products are owned by the products module).
   */
  async countProducts(id: string): Promise<number> {
    const [row] = await this.database.select({ total: count() }).from(product).where(eq(product.categoryId, id));
    return row.total;
  }

  /**
   * Product count per category id, for the categories that have at least one product.
   */
  async countProductsByCategory(): Promise<Map<string, number>> {
    const rows = await this.database
      .select({ categoryId: product.categoryId, total: count() })
      .from(product)
      .groupBy(product.categoryId);
    return new Map(rows.map((row) => [row.categoryId, row.total]));
  }
}
