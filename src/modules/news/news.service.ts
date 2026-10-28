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
import { NEWS_SLUG_MAX_LENGTH } from './constants/news.constants.js';
import type { CreateNewsDto } from './dto/create-news.dto.js';
import type { ListNewsQueryDto } from './dto/list-news-query.dto.js';
import type { ListPublicNewsQueryDto } from './dto/list-public-news-query.dto.js';
import type { UpdateNewsDto } from './dto/update-news.dto.js';
import { NewsRepository } from './news.repository.js';
import type {
  NewsListItem,
  NewsPatch,
  NewsRecord,
  NewsView,
  PublicNewsDetail,
  PublicNewsListItem,
} from './types/news.types.js';

const NULLABLE_FIELDS: readonly string[] = ['excerpt', 'seoTitle', 'seoDescription', 'publishedAt'];

/** Business rules of news: unique slugs, slug redirects, publication date, pictures. */
@Injectable()
export class NewsService {
  constructor(
    private readonly newsRepository: NewsRepository,
    private readonly slugRedirectsService: SlugRedirectsService,
    private readonly mediaService: MediaService,
  ) {}

  /** A page of news including unpublished ones, without the body text. */
  async list(query: ListNewsQueryDto): Promise<PaginatedResult<NewsListItem>> {
    const { rows, total } = await this.newsRepository.findPage(query);
    const covers = await this.mediaService.getCovers({ entityType: 'news', entityIds: rows.map((row) => row.id) });
    const items: NewsListItem[] = rows.map((row) => ({ ...row, cover: covers.get(row.id) ?? null }));
    return buildPaginatedResult({ items, page: query.page, pageSize: query.pageSize, total });
  }

  /** A page of published news with cover images, without the body text. */
  async listPublic({ isPromo, page, pageSize }: ListPublicNewsQueryDto): Promise<PaginatedResult<PublicNewsListItem>> {
    const { rows, total } = await this.newsRepository.findPublishedPage({ isPromo, page, pageSize });
    const covers = await this.mediaService.getCoverImages({
      entityType: 'news',
      entityIds: rows.map((row) => row.id),
    });
    const items: PublicNewsListItem[] = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      isPromo: row.isPromo,
      publishedAt: row.publishedAt,
      coverImage: covers.get(row.id) ?? null,
    }));
    return buildPaginatedResult({ items, page, pageSize, total });
  }

  /** One published news item with its body text; fails with 404 NEWS_NOT_FOUND. */
  async getPublic(id: string): Promise<PublicNewsDetail> {
    const record: NewsRecord | undefined = await this.newsRepository.findById(id);
    if (record === undefined || !record.isPublished) {
      throw new AppException(ErrorCode.NEWS_NOT_FOUND, HttpStatus.NOT_FOUND, 'News not found');
    }
    const images = await this.mediaService.listImages({ entityType: 'news', entityId: id });
    return {
      id: record.id,
      slug: record.slug,
      title: record.title,
      excerpt: record.excerpt,
      content: record.content,
      isPromo: record.isPromo,
      seoTitle: record.seoTitle,
      seoDescription: record.seoDescription,
      publishedAt: record.publishedAt,
      updatedAt: record.updatedAt,
      images,
    };
  }

  /** One news item with its body text; fails with 404 NEWS_NOT_FOUND. */
  async get(id: string): Promise<NewsView> {
    return this.toView(await this.getRecordOrThrow(id));
  }

  /** Creates a news item (unpublished unless `isPublished` is true). */
  async create(dto: CreateNewsDto): Promise<NewsView> {
    const { slug: explicitSlug, publishedAt, ...fields } = dto;
    const slug: string = resolveSlugCandidate({
      name: dto.title,
      slug: explicitSlug,
      maxLength: NEWS_SLUG_MAX_LENGTH,
    });
    await this.assertSlugAvailable({ slug });
    try {
      const record: NewsRecord = await this.newsRepository.insert({
        ...fields,
        slug,
        publishedAt: this.resolvePublishedAt({ requested: publishedAt, isPublished: dto.isPublished, current: null }),
      });
      await this.slugRedirectsService.release({ entity: 'news', slug });
      return await this.toView(record);
    } catch (err) {
      throw isUniqueViolation(err) ? new SlugTakenException(slug) : err;
    }
  }

  /** Updates a news item. A changed slug is stored in `slug_redirect`. */
  async update(id: string, dto: UpdateNewsDto): Promise<NewsView> {
    assertNoNullFields({ dto, nullableFields: NULLABLE_FIELDS });
    const existing: NewsRecord = await this.getRecordOrThrow(id);
    const isSlugChanged: boolean = dto.slug !== undefined && dto.slug !== existing.slug;
    if (isSlugChanged && dto.slug !== undefined) {
      await this.assertSlugAvailable({ slug: dto.slug, excludeId: id });
    }
    const { publishedAt, ...fields } = dto;
    const patch: NewsPatch = {
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
    let updated: NewsRecord;
    try {
      updated = await this.newsRepository.update({ id, patch });
    } catch (err) {
      throw isUniqueViolation(err) && dto.slug !== undefined ? new SlugTakenException(dto.slug) : err;
    }
    if (isSlugChanged) {
      await this.slugRedirectsService.recordChange({ entity: 'news', oldSlug: existing.slug, targetId: id });
      await this.slugRedirectsService.release({ entity: 'news', slug: updated.slug });
    }
    return this.toView(updated);
  }

  /** Deletes a news item, its slug redirects and its pictures. */
  async remove(id: string): Promise<void> {
    await this.getRecordOrThrow(id);
    await this.newsRepository.delete(id);
    await this.slugRedirectsService.removeForTarget({ entity: 'news', targetId: id });
    await this.mediaService.removeAllImages({ entityType: 'news', entityId: id });
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

  private async getRecordOrThrow(id: string): Promise<NewsRecord> {
    const record: NewsRecord | undefined = await this.newsRepository.findById(id);
    if (record === undefined) {
      throw new AppException(ErrorCode.NEWS_NOT_FOUND, HttpStatus.NOT_FOUND, 'News not found');
    }
    return record;
  }

  private async toView(record: NewsRecord): Promise<NewsView> {
    const images = await this.mediaService.listImages({ entityType: 'news', entityId: record.id });
    return { ...record, images };
  }

  private async assertSlugAvailable({ slug, excludeId }: { slug: string; excludeId?: string }): Promise<void> {
    const owner: NewsRecord | undefined = await this.newsRepository.findBySlug(slug);
    if (owner !== undefined && owner.id !== excludeId) {
      throw new SlugTakenException(slug);
    }
  }
}
