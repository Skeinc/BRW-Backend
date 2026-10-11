import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, getTableColumns, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { PageParams } from '../../common/lib/pagination.types.js';
import { toOffset } from '../../common/lib/pagination.js';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';
import { category } from '../../database/schema/category.js';
import { collection } from '../../database/schema/collection.js';
import { orderRequestItem } from '../../database/schema/order-request-item.js';
import { product } from '../../database/schema/product.js';
import { productImage } from '../../database/schema/product-image.js';
import type { NewProduct, ProductListFilters, ProductListRow, ProductRecord } from './products.types.js';

const LIKE_SPECIAL_CHARACTERS = /[\\%_]/g;

@Injectable()
export class ProductsRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly database: DrizzleDatabase,
  ) {}

  /**
   * One page of products (published or not) with category and collection names and the cover image key, newest first.
   */
  async findPage({ filters, params }: { filters: ProductListFilters; params: PageParams }): Promise<ProductListRow[]> {
    return this.database
      .select({
        ...getTableColumns(product),
        categoryName: category.name,
        collectionName: collection.name,
        coverKey: sql<string | null>`(
          select ${productImage.key} from ${productImage}
          where ${productImage.productId} = ${product.id}
          order by ${productImage.sortOrder}, ${productImage.id}
          limit 1
        )`,
      })
      .from(product)
      .innerJoin(category, eq(category.id, product.categoryId))
      .leftJoin(collection, eq(collection.id, product.collectionId))
      .where(this.buildWhere(filters))
      .orderBy(desc(product.createdAt), desc(product.id))
      .limit(params.pageSize)
      .offset(toOffset(params));
  }

  async count(filters: ProductListFilters): Promise<number> {
    const [row] = await this.database.select({ total: count() }).from(product).where(this.buildWhere(filters));
    return row.total;
  }

  async findById(id: string): Promise<ProductRecord | undefined> {
    const [row] = await this.database.select().from(product).where(eq(product.id, id));
    return row;
  }

  /**
   * A product with its category and collection names.
   */
  async findDetailById(id: string): Promise<Omit<ProductListRow, 'coverKey'> | undefined> {
    const [row] = await this.database
      .select({ ...getTableColumns(product), categoryName: category.name, collectionName: collection.name })
      .from(product)
      .innerJoin(category, eq(category.id, product.categoryId))
      .leftJoin(collection, eq(collection.id, product.collectionId))
      .where(eq(product.id, id));
    return row;
  }

  async findBySlug(slug: string): Promise<ProductRecord | undefined> {
    const [row] = await this.database.select().from(product).where(eq(product.slug, slug));
    return row;
  }

  async findBySku(sku: string): Promise<ProductRecord | undefined> {
    const [row] = await this.database.select().from(product).where(eq(product.sku, sku));
    return row;
  }

  async create(values: NewProduct): Promise<ProductRecord> {
    const [row] = await this.database.insert(product).values(values).returning();
    return row;
  }

  async update({ id, values }: { id: string; values: Partial<NewProduct> }): Promise<ProductRecord> {
    const [row] = await this.database.update(product).set(values).where(eq(product.id, id)).returning();
    return row;
  }

  async delete(id: string): Promise<void> {
    await this.database.delete(product).where(eq(product.id, id));
  }

  /**
   * Order lines that reference the product. Such a product cannot be deleted.
   */
  async countOrderItems(id: string): Promise<number> {
    const [row] = await this.database
      .select({ total: count() })
      .from(orderRequestItem)
      .where(eq(orderRequestItem.productId, id));
    return row.total;
  }

  private buildWhere({ categoryIds, collectionId, q }: ProductListFilters): SQL | undefined {
    const pattern: string | undefined = q ? `%${q.replace(LIKE_SPECIAL_CHARACTERS, '\\$&')}%` : undefined;
    return and(
      categoryIds ? inArray(product.categoryId, categoryIds) : undefined,
      collectionId ? eq(product.collectionId, collectionId) : undefined,
      pattern ? or(ilike(product.name, pattern), ilike(product.sku, pattern)) : undefined,
    );
  }
}
