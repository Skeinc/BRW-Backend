import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { buildContainsPattern } from '../../common/lib/build-contains-pattern.js';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';
import { category } from '../../database/schema/category.js';
import { collection } from '../../database/schema/collection.js';
import { product } from '../../database/schema/product.js';
import type {
  NewProductValues,
  ProductListFilters,
  ProductListRowsResult,
  ProductPatch,
  ProductRecord,
} from './types/products.types.js';

/** Drizzle queries for the `product` table. */
@Injectable()
export class ProductsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /** One page of products (published or not), newest first, with category and collection names. */
  async findPage(filters: ProductListFilters): Promise<ProductListRowsResult> {
    const where: SQL | undefined = this.buildWhere(filters);
    const rows = await this.db
      .select({
        id: product.id,
        slug: product.slug,
        sku: product.sku,
        name: product.name,
        price: product.price,
        oldPrice: product.oldPrice,
        stockStatus: product.stockStatus,
        isPublished: product.isPublished,
        categoryId: product.categoryId,
        categoryName: category.name,
        collectionId: product.collectionId,
        collectionName: collection.name,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      })
      .from(product)
      .innerJoin(category, eq(category.id, product.categoryId))
      .leftJoin(collection, eq(collection.id, product.collectionId))
      .where(where)
      .orderBy(desc(product.createdAt), desc(product.id))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize);
    const [totalRow] = await this.db.select({ total: count() }).from(product).where(where);
    return { rows, total: totalRow.total };
  }

  /** Finds one row by id, or undefined when it does not exist. */
  async findById(id: string): Promise<ProductRecord | undefined> {
    const [record] = await this.db.select().from(product).where(eq(product.id, id));
    return record;
  }

  /** Finds one row by slug, or undefined when it does not exist. */
  async findBySlug(slug: string): Promise<ProductRecord | undefined> {
    const [record] = await this.db.select().from(product).where(eq(product.slug, slug));
    return record;
  }

  /** Finds one row by SKU, or undefined when it does not exist. */
  async findBySku(sku: string): Promise<ProductRecord | undefined> {
    const [record] = await this.db.select().from(product).where(eq(product.sku, sku));
    return record;
  }

  /** Inserts a row and returns it. */
  async insert(values: NewProductValues): Promise<ProductRecord> {
    const [record] = await this.db.insert(product).values(values).returning();
    return record;
  }

  /** Updates a row by id and returns it. */
  async update({ id, patch }: { id: string; patch: ProductPatch }): Promise<ProductRecord> {
    const [record] = await this.db.update(product).set(patch).where(eq(product.id, id)).returning();
    return record;
  }

  /** Deletes a row by id. */
  async delete(id: string): Promise<void> {
    await this.db.delete(product).where(eq(product.id, id));
  }

  private buildWhere({ categoryId, collectionId, q, isPublished }: ProductListFilters): SQL | undefined {
    const conditions: (SQL | undefined)[] = [
      categoryId === undefined ? undefined : this.buildCategoryTreeCondition(categoryId),
      collectionId === undefined ? undefined : eq(product.collectionId, collectionId),
      isPublished === undefined ? undefined : eq(product.isPublished, isPublished),
      q === undefined ? undefined : this.buildSearchCondition(q),
    ];
    return and(...conditions);
  }

  /** Matches the category itself and every category below it. */
  private buildCategoryTreeCondition(categoryId: string): SQL {
    return sql`${product.categoryId} IN (
      WITH RECURSIVE category_tree AS (
        SELECT ${category.id} AS id FROM ${category} WHERE ${category.id} = ${categoryId}
        UNION ALL
        SELECT child.id FROM ${category} child JOIN category_tree parent ON child.parent_id = parent.id
      )
      SELECT id FROM category_tree
    )`;
  }

  /** Case-insensitive substring match on name (served by the trigram index) or SKU. */
  private buildSearchCondition(q: string): SQL | undefined {
    const pattern: string = buildContainsPattern(q);
    return or(ilike(product.name, pattern), ilike(product.sku, pattern));
  }
}
