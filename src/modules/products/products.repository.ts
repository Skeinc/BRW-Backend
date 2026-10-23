import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  isNotNull,
  max,
  min,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { buildContainsPattern } from '../../common/lib/build-contains-pattern.js';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';
import { category } from '../../database/schema/category.js';
import { collection } from '../../database/schema/collection.js';
import { product } from '../../database/schema/product.js';
import { toCollectionRef } from './lib/to-collection-ref.js';
import { buildVisibleCategoryIds } from '../categories/lib/build-visible-category-ids.js';
import { buildPublicProductOrder } from './lib/build-public-product-order.js';
import { buildPublicProductWhere } from './lib/build-public-product-where.js';
import { buildNoPhotoCondition } from './lib/build-no-photo-condition.js';
import { buildNotOrderedCondition } from './lib/build-not-ordered-condition.js';
import type {
  FacetValue,
  NewProductValues,
  ProductFacets,
  ProductIssue,
  ProductListFilters,
  ProductListRowsResult,
  ProductPatch,
  ProductRecord,
  PublicProductDetailRow,
  PublicProductFilterKey,
  PublicProductFilters,
  PublicProductRowsResult,
  PublicProductSort,
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

  /** One page of published products matching the storefront filters, with category and collection refs. */
  async findPublicPage({
    filters,
    sort,
    page,
    pageSize,
  }: {
    filters: PublicProductFilters;
    sort: PublicProductSort;
    page: number;
    pageSize: number;
  }): Promise<PublicProductRowsResult> {
    const where: SQL | undefined = buildPublicProductWhere({ filters });
    const [rows, [totalRow]] = await Promise.all([
      this.db
        .select({
          id: product.id,
          slug: product.slug,
          name: product.name,
          sku: product.sku,
          price: product.price,
          oldPrice: product.oldPrice,
          stockStatus: product.stockStatus,
          category: { id: category.id, slug: category.slug, name: category.name },
          collectionId: collection.id,
          collectionSlug: collection.slug,
          collectionName: collection.name,
        })
        .from(product)
        .innerJoin(category, eq(category.id, product.categoryId))
        .leftJoin(collection, and(eq(collection.id, product.collectionId), eq(collection.isPublished, true)))
        .where(where)
        .orderBy(...buildPublicProductOrder(sort))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db.select({ total: count() }).from(product).where(where),
    ]);
    return {
      rows: rows.map(({ collectionId, collectionSlug, collectionName, ...row }) => ({
        ...row,
        collection: toCollectionRef({ collectionId, collectionSlug, collectionName }),
      })),
      total: totalRow.total,
    };
  }

  /** Values available for each filter, every one counted without its own filter. */
  async findFacets(filters: PublicProductFilters): Promise<ProductFacets> {
    const [price, collections, materials, colorsBody, colorsFacade] = await Promise.all([
      this.findPriceRange(filters),
      this.findCollectionFacet(filters),
      this.countByColumn({ filters, column: product.material, omit: 'material' }),
      this.countByColumn({ filters, column: product.colorBody, omit: 'colorBody' }),
      this.countByColumn({ filters, column: product.colorFacade, omit: 'colorFacade' }),
    ]);
    return { price, collections, materials, colorsBody, colorsFacade };
  }

  /** A published product with its category and collection refs, or undefined. */
  async findPublishedDetail(id: string): Promise<PublicProductDetailRow | undefined> {
    const [row] = await this.db
      .select({
        record: getTableColumns(product),
        category: { id: category.id, slug: category.slug, name: category.name },
        collectionId: collection.id,
        collectionSlug: collection.slug,
        collectionName: collection.name,
      })
      .from(product)
      .innerJoin(category, eq(category.id, product.categoryId))
      .leftJoin(collection, and(eq(collection.id, product.collectionId), eq(collection.isPublished, true)))
      .where(
        and(
          eq(product.id, id),
          eq(product.isPublished, true),
          sql`${product.categoryId} IN ${buildVisibleCategoryIds()}`,
        ),
      );
    if (row === undefined) {
      return undefined;
    }
    const { collectionId, collectionSlug, collectionName, ...rest } = row;
    return { ...rest, collection: toCollectionRef({ collectionId, collectionSlug, collectionName }) };
  }

  /** Published products of visible categories among the given ids; unknown and unpublished ids are simply absent. */
  async findPublishedByIds(ids: string[]): Promise<ProductRecord[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.db
      .select()
      .from(product)
      .where(
        and(
          inArray(product.id, ids),
          eq(product.isPublished, true),
          sql`${product.categoryId} IN ${buildVisibleCategoryIds()}`,
        ),
      );
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

  private async findPriceRange(filters: PublicProductFilters): Promise<ProductFacets['price']> {
    const [row] = await this.db
      .select({ min: min(product.price), max: max(product.price) })
      .from(product)
      .where(buildPublicProductWhere({ filters, omit: 'price' }));
    return { min: row.min, max: row.max };
  }

  private async findCollectionFacet(filters: PublicProductFilters): Promise<ProductFacets['collections']> {
    return this.db
      .select({ slug: collection.slug, name: collection.name, count: count() })
      .from(product)
      .innerJoin(collection, eq(collection.id, product.collectionId))
      .where(and(buildPublicProductWhere({ filters, omit: 'collection' }), eq(collection.isPublished, true)))
      .groupBy(collection.id)
      .orderBy(asc(collection.sortOrder), asc(collection.name));
  }

  private async countByColumn({
    filters,
    column,
    omit,
  }: {
    filters: PublicProductFilters;
    column: typeof product.material | typeof product.colorBody | typeof product.colorFacade;
    omit: PublicProductFilterKey;
  }): Promise<FacetValue[]> {
    const rows = await this.db
      .select({ value: column, count: count() })
      .from(product)
      .where(and(buildPublicProductWhere({ filters, omit }), isNotNull(column)))
      .groupBy(column)
      .orderBy(asc(column));
    return rows.flatMap((row) => (row.value === null ? [] : [{ value: row.value, count: row.count }]));
  }

  private buildWhere({ categoryId, collectionId, q, isPublished, issue }: ProductListFilters): SQL | undefined {
    const conditions: (SQL | undefined)[] = [
      categoryId === undefined ? undefined : this.buildCategoryTreeCondition(categoryId),
      collectionId === undefined ? undefined : eq(product.collectionId, collectionId),
      isPublished === undefined ? undefined : eq(product.isPublished, isPublished),
      q === undefined ? undefined : this.buildSearchCondition(q),
      issue === undefined ? undefined : this.buildIssueCondition(issue),
    ];
    return and(...conditions);
  }

  /** Same definitions as the catalog health counters of the analytics report. */
  private buildIssueCondition(issue: ProductIssue): SQL {
    const conditions: Record<ProductIssue, SQL> = {
      out_of_stock: sql`${product.stockStatus} = 'out_of_stock'`,
      no_photo: buildNoPhotoCondition(sql`${product.id}`),
      no_collection: sql`${product.collectionId} IS NULL`,
      not_ordered: buildNotOrderedCondition(sql`${product.id}`),
    };
    return conditions[issue];
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
