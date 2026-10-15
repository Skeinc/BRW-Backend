import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.js';
import { SlugTakenException } from '../../common/errors/slug-taken.exception.js';
import { assertNoNullFields } from '../../common/lib/assert-no-null-fields.js';
import { buildPaginatedResult } from '../../common/lib/build-paginated-result.js';
import { hasDefinedValues } from '../../common/lib/has-defined-values.js';
import { isUniqueViolation } from '../../common/lib/is-unique-violation.js';
import type { PaginatedResult } from '../../common/lib/pagination.types.js';
import { resolveSlugCandidate } from '../../common/lib/resolve-slug-candidate.js';
import { MediaService } from '../media/media.service.js';
import { SlugRedirectsService } from '../slug-redirects/slug-redirects.service.js';
import { ARTICLE_SLUG_MAX_LENGTH } from './constants/articles.constants.js';
import type { CreateArticleDto } from './dto/create-article.dto.js';
import type { ListArticlesQueryDto } from './dto/list-articles-query.dto.js';
import type { UpdateArticleDto } from './dto/update-article.dto.js';
import { ArticlesRepository } from './articles.repository.js';
import type { ArticleListItem, ArticlePatch, ArticleRecord, ArticleView } from './types/articles.types.js';

const NULLABLE_FIELDS: readonly string[] = ['excerpt', 'seoTitle', 'seoDescription', 'publishedAt'];

/** Business rules of articles: unique slugs, slug redirects, publication date, picture. */
@Injectable()
export class ArticlesService {
  constructor(
    private readonly articlesRepository: ArticlesRepository,
    private readonly slugRedirectsService: SlugRedirectsService,
    private readonly mediaService: MediaService,
  ) {}

  /** A page of articles including unpublished ones, without the body text. */
  async list(query: ListArticlesQueryDto): Promise<PaginatedResult<ArticleListItem>> {
    const { rows, total } = await this.articlesRepository.findPage(query);
    const covers = await this.mediaService.getCovers({ entityType: 'article', entityIds: rows.map((row) => row.id) });
    const items: ArticleListItem[] = rows.map((row) => ({ ...row, cover: covers.get(row.id) ?? null }));
    return buildPaginatedResult({ items, page: query.page, pageSize: query.pageSize, total });
  }

  /** One article with its body text; fails with 404 ARTICLE_NOT_FOUND. */
  async get(id: string): Promise<ArticleView> {
    return this.toView(await this.getRecordOrThrow(id));
  }

  /** Creates a article (unpublished unless `isPublished` is true). */
  async create(dto: CreateArticleDto): Promise<ArticleView> {
    const { slug: explicitSlug, publishedAt, ...fields } = dto;
    const slug: string = resolveSlugCandidate({
      name: dto.title,
      slug: explicitSlug,
      maxLength: ARTICLE_SLUG_MAX_LENGTH,
    });
    await this.assertSlugAvailable({ slug });
    try {
      const record: ArticleRecord = await this.articlesRepository.insert({
        ...fields,
        slug,
        publishedAt: this.resolvePublishedAt({ requested: publishedAt, isPublished: dto.isPublished, current: null }),
      });
      await this.slugRedirectsService.release({ entity: 'article', slug });
      return await this.toView(record);
    } catch (err) {
      throw isUniqueViolation(err) ? new SlugTakenException(slug) : err;
    }
  }

  /** Updates a article. A changed slug is stored in `slug_redirect`. */
  async update(id: string, dto: UpdateArticleDto): Promise<ArticleView> {
    assertNoNullFields({ dto, nullableFields: NULLABLE_FIELDS });
    const existing: ArticleRecord = await this.getRecordOrThrow(id);
    const isSlugChanged: boolean = dto.slug !== undefined && dto.slug !== existing.slug;
    if (isSlugChanged && dto.slug !== undefined) {
      await this.assertSlugAvailable({ slug: dto.slug, excludeId: id });
    }
    const { publishedAt, ...fields } = dto;
    const patch: ArticlePatch = {
      ...fields,
      publishedAt: this.resolvePublishedAt({
        requested: publishedAt,
        isPublished: dto.isPublished,
        current: existing.publishedAt,
      }),
    };
    if (!hasDefinedValues(patch)) {
      return this.toView(existing);
    }
    let updated: ArticleRecord;
    try {
      updated = await this.articlesRepository.update({ id, patch });
    } catch (err) {
      throw isUniqueViolation(err) && dto.slug !== undefined ? new SlugTakenException(dto.slug) : err;
    }
    if (isSlugChanged) {
      await this.slugRedirectsService.recordChange({ entity: 'article', oldSlug: existing.slug, targetId: id });
      await this.slugRedirectsService.release({ entity: 'article', slug: updated.slug });
    }
    return this.toView(updated);
  }

  /** Deletes a article, its slug redirects and its picture. */
  async remove(id: string): Promise<void> {
    await this.getRecordOrThrow(id);
    await this.articlesRepository.delete(id);
    await this.slugRedirectsService.removeForTarget({ entity: 'article', targetId: id });
    await this.mediaService.removeAllImages({ entityType: 'article', entityId: id });
  }

  /**
   * An explicit date wins (`null` clears it); otherwise the first publish stamps the current time
   * and an already stamped date is kept, even if the item is unpublished later.
   */
  private resolvePublishedAt({
    requested,
    isPublished,
    current,
  }: {
    requested: string | null | undefined;
    isPublished: boolean | undefined;
    current: Date | null;
  }): Date | null | undefined {
    if (requested !== undefined) {
      return requested === null ? null : new Date(requested);
    }
    if (isPublished === true && current === null) {
      return new Date();
    }
    return undefined;
  }

  private async getRecordOrThrow(id: string): Promise<ArticleRecord> {
    const record: ArticleRecord | undefined = await this.articlesRepository.findById(id);
    if (record === undefined) {
      throw new AppException(ErrorCode.ARTICLE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Article not found');
    }
    return record;
  }

  private async toView(record: ArticleRecord): Promise<ArticleView> {
    const images = await this.mediaService.listImages({ entityType: 'article', entityId: record.id });
    return { ...record, images };
  }

  private async assertSlugAvailable({ slug, excludeId }: { slug: string; excludeId?: string }): Promise<void> {
    const owner: ArticleRecord | undefined = await this.articlesRepository.findBySlug(slug);
    if (owner !== undefined && owner.id !== excludeId) {
      throw new SlugTakenException(slug);
    }
  }
}
