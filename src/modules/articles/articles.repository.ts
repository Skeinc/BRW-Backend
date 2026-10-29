import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, getTableColumns, ilike, sql, type SQL } from 'drizzle-orm';
import { buildContainsPattern } from '../../common/lib/build-contains-pattern.js';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';
import { article } from '../../database/schema/article.js';
import type {
  ArticleListFilters,
  ArticleListRowsResult,
  PublicArticleFilters,
  ArticlePatch,
  ArticleRecord,
  NewArticleValues,
} from './types/articles.types.js';

/** Drizzle queries for the `article` table. */
@Injectable()
export class ArticlesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /** One page of rows (published or not), newest first, without the body text. */
  async findPage({ q, isPublished, page, pageSize }: ArticleListFilters): Promise<ArticleListRowsResult> {
    const where: SQL | undefined = and(
      q === undefined ? undefined : ilike(article.title, buildContainsPattern(q)),
      isPublished === undefined ? undefined : eq(article.isPublished, isPublished),
    );
    const { content: _content, ...columns } = getTableColumns(article);
    const rows = await this.db
      .select(columns)
      .from(article)
      .where(where)
      .orderBy(sql`${article.publishedAt} DESC NULLS FIRST`, desc(article.createdAt), desc(article.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const [totalRow] = await this.db.select({ total: count() }).from(article).where(where);
    return { rows, total: totalRow.total };
  }

  /** One page of published rows, most recently published first, without the body text. */
  async findPublishedPage({ page, pageSize }: PublicArticleFilters): Promise<ArticleListRowsResult> {
    const where: SQL = eq(article.isPublished, true);
    const { content: _content, ...columns } = getTableColumns(article);
    const rows = await this.db
      .select(columns)
      .from(article)
      .where(where)
      .orderBy(sql`${article.publishedAt} DESC NULLS LAST`, desc(article.createdAt), desc(article.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const [totalRow] = await this.db.select({ total: count() }).from(article).where(where);
    return { rows, total: totalRow.total };
  }

  /** Finds one row by id, or undefined when it does not exist. */
  async findById(id: string): Promise<ArticleRecord | undefined> {
    const [record] = await this.db.select().from(article).where(eq(article.id, id));
    return record;
  }

  /** Finds one row by slug, or undefined when it does not exist. */
  async findBySlug(slug: string): Promise<ArticleRecord | undefined> {
    const [record] = await this.db.select().from(article).where(eq(article.slug, slug));
    return record;
  }

  /** Inserts a row and returns it. */
  async insert(values: NewArticleValues): Promise<ArticleRecord> {
    const [record] = await this.db.insert(article).values(values).returning();
    return record;
  }

  /** Updates a row by id and returns it. */
  async update({ id, patch }: { id: string; patch: ArticlePatch }): Promise<ArticleRecord> {
    const [record] = await this.db.update(article).set(patch).where(eq(article.id, id)).returning();
    return record;
  }

  /** Deletes a row by id. */
  async delete(id: string): Promise<void> {
    await this.db.delete(article).where(eq(article.id, id));
  }
}
