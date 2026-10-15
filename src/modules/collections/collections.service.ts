import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.js';
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
  CollectionPatch,
  CollectionRecord,
  CollectionView,
} from './types/collections.types.js';
import type { CreateCollectionDto } from './dto/create-collection.dto.js';
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

  /** All collections with their product counts. */
  async list(): Promise<CollectionView[]> {
    const [records, counts] = await Promise.all([
      this.collectionsRepository.findAll(),
      this.collectionsRepository.countProductsByCollection(),
    ]);
    const covers = await this.mediaService.getCovers({
      entityType: 'collection',
      entityIds: records.map((record) => record.id),
    });
    return records.map((record) => ({
      ...record,
      productCount: counts.get(record.id) ?? 0,
      cover: covers.get(record.id) ?? null,
    }));
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
      const record: CollectionRecord = await this.collectionsRepository.insert({ ...fields, slug });
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
