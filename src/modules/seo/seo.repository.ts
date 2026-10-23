import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql, type SQL } from 'drizzle-orm';
import { buildVisibleCategoryIds } from '../categories/lib/build-visible-category-ids.js';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';
import { article } from '../../database/schema/article.js';
import { category } from '../../database/schema/category.js';
import { collection } from '../../database/schema/collection.js';
import { product } from '../../database/schema/product.js';
import { slugRedirect } from '../../database/schema/slug-redirect.js';
import type { ResolvedSlug, SeoEntityType, SeoUrl } from './types/seo.types.js';

const ENTITY_TABLES = { category, collection, product, article } as const;

/** Read-only Drizzle queries for the sitemap and old-slug lookups. */
@Injectable()
export class SeoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /** Slug and update time of every published row of one entity type. */
  async findPublishedUrls(type: SeoEntityType): Promise<SeoUrl[]> {
    const table = ENTITY_TABLES[type];
    return this.db
      .select({ id: table.id, slug: table.slug, updatedAt: table.updatedAt })
      .from(table)
      .where(and(eq(table.isPublished, true), this.buildVisibleCondition(type)))
      .orderBy(asc(table.slug));
  }

  /** The current slug of the published entity that an old slug pointed to, or undefined. */
  async findCurrentSlug({ type, slug }: { type: SeoEntityType; slug: string }): Promise<ResolvedSlug | undefined> {
    const table = ENTITY_TABLES[type];
    const [row] = await this.db
      .select({ id: table.id, slug: table.slug })
      .from(slugRedirect)
      .innerJoin(table, eq(table.id, slugRedirect.targetId))
      .where(
        and(
          eq(slugRedirect.entity, type),
          eq(slugRedirect.oldSlug, slug),
          eq(table.isPublished, true),
          this.buildVisibleCondition(type),
        ),
      );
    return row === undefined ? undefined : { type, ...row };
  }

  /** Categories need a published chain of parents and products a visible category; collections and articles need nothing more. */
  private buildVisibleCondition(type: SeoEntityType): SQL | undefined {
    const conditions: Record<SeoEntityType, SQL | undefined> = {
      category: sql`${category.id} IN ${buildVisibleCategoryIds()}`,
      collection: undefined,
      article: undefined,
      product: sql`${product.categoryId} IN ${buildVisibleCategoryIds()}`,
    };
    return conditions[type];
  }
}
