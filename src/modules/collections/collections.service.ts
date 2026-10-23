import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.js';
import { buildPaginatedResult } from '../../common/lib/build-paginated-result.js';
import { moveItem, planSortOrders } from '../../common/lib/reorder-items.js';
import type { PaginatedResult } from '../../common/lib/pagination.types.js';
import { SlugTakenException } from '../../common/errors/slug-taken.exception.js';
import { assertNoNullFields } from '../../common/lib/assert-no-null-fields.js';
import { hasDefinedValues } from '../../common/lib/has-defined-values.js';
import { isUniqueViolation } from '../../common/lib/is-unique-violation.js';
import { resolveSlugCandidate } from '../../common/lib/resolve-slug-candidate.js';
import { getCover } from '../media/lib/get-cover.js';
import { MediaService } from '../media/media.service.js';
import { SlugRedirectsService } from '../slug-redirects/slug-redirects.service.js';
import { COLLECTION_SLUG_MAX_LENGTH } from './constants/collections.constants.js';
import { CollectionsRepository } from './collections.repository.js';
import type {
  CollectionDetailView,
  CollectionOption,
  CollectionPatch,
  CollectionRecord,
  CollectionView,
  PublicCollectionDetail,
  PublicCollectionItem,
} from './types/collections.types.js';
import type { MediaCover } from '../media/types/media.types.js';
import type { CreateCollectionDto } from './dto/create-collection.dto.js';
import type { ListCollectionsQueryDto } from './dto/list-collections-query.dto.js';
import type { UpdateCollectionDto } from './dto/update-collection.dto.js';

const NULLABLE_FIELDS: readonly string[] = ['description', 'seoTitle', 'seoDescription'];

/** Business rules of collections: unique slugs, slug redirects, safe deletion. */
@Injectable()
export class CollectionsService {
  constructor(
    private readonly collectionsRepository: CollectionsRepository,
    private readonly slugRedirectsService: SlugRedirectsService,
    private readonly mediaService: MediaService,
  ) {}

  /** One page of collections by sort order, after the search and filters (a few dozen rows, filtered in memory). */
  async list(query: ListCollectionsQueryDto): Promise<PaginatedResult<CollectionView>> {
    const { page, pageSize } = query;
    const [records, counts] = await Promise.all([
      this.collectionsRepository.findAll(),
      this.collectionsRepository.countProductsByCollection(),
    ]);
    const matching: CollectionRecord[] = records.filter((record) =>
      this.matchesFilters({ record, productCount: counts.get(record.id) ?? 0, query }),
    );
    const pageRecords: CollectionRecord[] = matching.slice((page - 1) * pageSize, page * pageSize);
    const covers = await this.mediaService.getCovers({
      entityType: 'collection',
      entityIds: pageRecords.map((record) => record.id),
    });
    const items: CollectionView[] = pageRecords.map((record) => ({
      ...record,
      productCount: counts.get(record.id) ?? 0,
      cover: covers.get(record.id) ?? null,
    }));
    return buildPaginatedResult({ items, page, pageSize, total: matching.length });
  }

  /** Published collections in sort order with their published product count and cover. */
  async listPublic(): Promise<PublicCollectionItem[]> {
    const [records, counts] = await Promise.all([
      this.collectionsRepository.findAll(),
      this.collectionsRepository.countPublishedProductsByCollection(),
    ]);
    const published: CollectionRecord[] = records.filter((record) => record.isPublished);
    const covers = await this.mediaService.getCovers({
      entityType: 'collection',
      entityIds: published.map((record) => record.id),
    });
    return published.map((record) => this.toPublicItem({ record, counts, covers }));
  }

  /** One published collection; fails with 404 COLLECTION_NOT_FOUND. */
  async getPublic(id: string): Promise<PublicCollectionDetail> {
    const record: CollectionRecord | undefined = await this.collectionsRepository.findById(id);
    if (record === undefined || !record.isPublished) {
      throw new AppException(ErrorCode.COLLECTION_NOT_FOUND, HttpStatus.NOT_FOUND, 'Collection not found');
    }
    const [counts, covers] = await Promise.all([
      this.collectionsRepository.countPublishedProductsByCollection(),
      this.mediaService.getCovers({ entityType: 'collection', entityIds: [id] }),
    ]);
    return {
      ...this.toPublicItem({ record, counts, covers }),
      description: record.description,
      seoTitle: record.seoTitle,
      seoDescription: record.seoDescription,
      breadcrumbs: [{ id: record.id, slug: record.slug, name: record.name }],
    };
  }

  /** Every collection as id and name in sort order, not paged: for pickers and filters. */
  async listOptions(): Promise<CollectionOption[]> {
    const records: CollectionRecord[] = await this.collectionsRepository.findAll();
    return records.map(({ id, name }) => ({ id, name }));
  }

  /** Puts a collection where `overId` is now and shifts the ones in between. */
  async move({ id, overId }: { id: string; overId: string }): Promise<void> {
    const records: CollectionRecord[] = await this.collectionsRepository.findAll();
    if (!records.some((record) => record.id === id) || !records.some((record) => record.id === overId)) {
      throw new AppException(ErrorCode.COLLECTION_NOT_FOUND, HttpStatus.NOT_FOUND, 'Collection not found');
    }
    const ordered: CollectionRecord[] = moveItem({ items: records, id, overId });
    await this.collectionsRepository.applySortOrders(planSortOrders(ordered));
  }

  /** One collection; fails with 404 COLLECTION_NOT_FOUND. */
  async get(id: string): Promise<CollectionDetailView> {
    const record: CollectionRecord = await this.getRecordOrThrow(id);
    return this.toView(record);
  }

  /** Creates a collection; fails with 409 SLUG_TAKEN on a duplicate slug. */
  async create(dto: CreateCollectionDto): Promise<CollectionDetailView> {
    const { slug: explicitSlug, ...fields } = dto;
    const slug: string = resolveSlugCandidate({
      name: dto.name,
      slug: explicitSlug,
      maxLength: COLLECTION_SLUG_MAX_LENGTH,
    });
    await this.assertSlugAvailable({ slug });
    try {
      const sortOrder: number = fields.sortOrder ?? (await this.collectionsRepository.nextSortOrder());
      const record: CollectionRecord = await this.collectionsRepository.insert({ ...fields, slug, sortOrder });
      await this.slugRedirectsService.release({ entity: 'collection', slug });
      return await this.toView(record);
    } catch (err) {
      throw isUniqueViolation(err) ? new SlugTakenException(slug) : err;
    }
  }

  /** Updates a collection; a changed slug is stored in `slug_redirect`. */
  async update(id: string, dto: UpdateCollectionDto): Promise<CollectionDetailView> {
    assertNoNullFields({ dto, nullableFields: NULLABLE_FIELDS });
    const existing: CollectionRecord = await this.getRecordOrThrow(id);
    const patch: CollectionPatch = Object.assign({}, dto);
    const isSlugChanged: boolean = dto.slug !== undefined && dto.slug !== existing.slug;
    if (isSlugChanged && dto.slug !== undefined) {
      await this.assertSlugAvailable({ slug: dto.slug, excludeId: id });
    }
    if (!hasDefinedValues(patch)) {
      return this.toView(existing);
    }
    let updated: CollectionRecord;
    try {
      updated = await this.collectionsRepository.update({ id, patch });
    } catch (err) {
      throw isUniqueViolation(err) && dto.slug !== undefined ? new SlugTakenException(dto.slug) : err;
    }
    if (isSlugChanged) {
      await this.slugRedirectsService.recordChange({ entity: 'collection', oldSlug: existing.slug, targetId: id });
      await this.slugRedirectsService.release({ entity: 'collection', slug: updated.slug });
    }
    return this.toView(updated);
  }

  /** Deletes a collection without products; fails with 409 COLLECTION_NOT_EMPTY otherwise. */
  async remove(id: string): Promise<void> {
    await this.getRecordOrThrow(id);
    const productCount: number = await this.collectionsRepository.countProducts(id);
    if (productCount > 0) {
      throw new AppException(ErrorCode.COLLECTION_NOT_EMPTY, HttpStatus.CONFLICT, 'Collection has products', {
        productCount,
      });
    }
    await this.collectionsRepository.delete(id);
    await this.slugRedirectsService.removeForTarget({ entity: 'collection', targetId: id });
    await this.mediaService.removeAllImages({ entityType: 'collection', entityId: id });
  }

  /** Throws 404 COLLECTION_NOT_FOUND unless the collection exists. Used by modules that attach products. */
  async assertExists(id: string): Promise<void> {
    await this.getRecordOrThrow(id);
  }

  private toPublicItem({
    record,
    counts,
    covers,
  }: {
    record: CollectionRecord;
    counts: Map<string, number>;
    covers: Map<string, MediaCover>;
  }): PublicCollectionItem {
    return {
      id: record.id,
      slug: record.slug,
      name: record.name,
      imageUrl: covers.get(record.id)?.url ?? null,
      productCount: counts.get(record.id) ?? 0,
    };
  }

  private matchesFilters({
    record,
    productCount,
    query,
  }: {
    record: CollectionRecord;
    productCount: number;
    query: ListCollectionsQueryDto;
  }): boolean {
    const { q, isPublished, hasProducts } = query;
    const hasAnyProducts: boolean = productCount > 0;
    return (
      (q === undefined || record.name.toLowerCase().includes(q.toLowerCase())) &&
      (isPublished === undefined || record.isPublished === isPublished) &&
      (hasProducts === undefined || hasAnyProducts === hasProducts)
    );
  }

  private async getRecordOrThrow(id: string): Promise<CollectionRecord> {
    const record: CollectionRecord | undefined = await this.collectionsRepository.findById(id);
    if (record === undefined) {
      throw new AppException(ErrorCode.COLLECTION_NOT_FOUND, HttpStatus.NOT_FOUND, 'Collection not found');
    }
    return record;
  }

  private async toView(record: CollectionRecord): Promise<CollectionDetailView> {
    const [productCount, images] = await Promise.all([
      this.collectionsRepository.countProducts(record.id),
      this.mediaService.listImages({ entityType: 'collection', entityId: record.id }),
    ]);
    return { ...record, productCount, cover: getCover(images), images };
  }

  private async assertSlugAvailable({ slug, excludeId }: { slug: string; excludeId?: string }): Promise<void> {
    const owner: CollectionRecord | undefined = await this.collectionsRepository.findBySlug(slug);
    if (owner !== undefined && owner.id !== excludeId) {
      throw new SlugTakenException(slug);
    }
  }
}
