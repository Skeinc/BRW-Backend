import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, getTableColumns, ilike, sql, type SQL } from 'drizzle-orm';
import { buildContainsPattern } from '../../common/lib/build-contains-pattern.js';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';
import { news } from '../../database/schema/news.js';
import type {
  NewsListFilters,
  NewsListRowsResult,
  PublicNewsFilters,
  NewsPatch,
  NewsRecord,
  NewNewsValues,
} from './types/news.types.js';

/** Drizzle queries for the `news` table. */
@Injectable()
export class NewsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /** One page of rows (published or not), newest first, without the body text. */
  async findPage({ q, isPublished, isPromo, page, pageSize }: NewsListFilters): Promise<NewsListRowsResult> {
    const where: SQL | undefined = and(
      q === undefined ? undefined : ilike(news.title, buildContainsPattern(q)),
      isPublished === undefined ? undefined : eq(news.isPublished, isPublished),
      isPromo === undefined ? undefined : eq(news.isPromo, isPromo),
    );
    const { content: _content, ...columns } = getTableColumns(news);
    const rows = await this.db
      .select(columns)
      .from(news)
      .where(where)
      .orderBy(desc(news.createdAt), desc(news.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const [totalRow] = await this.db.select({ total: count() }).from(news).where(where);
    return { rows, total: totalRow.total };
  }

  /** One page of published rows, most recently published first, without the body text. */
  async findPublishedPage({ isPromo, page, pageSize }: PublicNewsFilters): Promise<NewsListRowsResult> {
    const where: SQL | undefined = and(
      eq(news.isPublished, true),
      isPromo === undefined ? undefined : eq(news.isPromo, isPromo),
    );
    const { content: _content, ...columns } = getTableColumns(news);
    const rows = await this.db
      .select(columns)
      .from(news)
      .where(where)
      .orderBy(sql`${news.publishedAt} DESC NULLS LAST`, desc(news.createdAt), desc(news.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const [totalRow] = await this.db.select({ total: count() }).from(news).where(where);
    return { rows, total: totalRow.total };
  }

  /** Finds one row by id, or undefined when it does not exist. */
  async findById(id: string): Promise<NewsRecord | undefined> {
    const [record] = await this.db.select().from(news).where(eq(news.id, id));
    return record;
  }

  /** Finds one row by slug, or undefined when it does not exist. */
  async findBySlug(slug: string): Promise<NewsRecord | undefined> {
    const [record] = await this.db.select().from(news).where(eq(news.slug, slug));
    return record;
  }

  /** Inserts a row and returns it. */
  async insert(values: NewNewsValues): Promise<NewsRecord> {
    const [record] = await this.db.insert(news).values(values).returning();
    return record;
  }

  /** Updates a row by id and returns it. */
  async update({ id, patch }: { id: string; patch: NewsPatch }): Promise<NewsRecord> {
    const [record] = await this.db.update(news).set(patch).where(eq(news.id, id)).returning();
    return record;
  }

  /** Deletes a row by id. */
  async delete(id: string): Promise<void> {
    await this.db.delete(news).where(eq(news.id, id));
  }
}
