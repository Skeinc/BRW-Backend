import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.js';
import { rejectNullFields } from '../../common/lib/reject-null-fields.js';
import { resolveSlug } from '../../common/lib/resolve-slug.js';
import { SlugRedirectService } from '../seo/slug-redirect.service.js';
import { CollectionsRepository } from './collections.repository.js';
import type { AdminCollection, CollectionRecord } from './collections.types.js';
import type { CreateCollectionDto } from './dto/create-collection.dto.js';
import type { UpdateCollectionDto } from './dto/update-collection.dto.js';

const SLUG_MAX_LENGTH = 120;

/**
 * Business rules of collections (furniture series): unique slugs, slug redirects and safe deletion.
 */
@Injectable()
export class CollectionsService {
  constructor(
    private readonly collectionsRepository: CollectionsRepository,
    private readonly slugRedirectService: SlugRedirectService,
  ) {}

  /**
   * All collections, published or not, with their product count.
   */
  async findAll(): Promise<AdminCollection[]> {
    const [rows, productCounts] = await Promise.all([
      this.collectionsRepository.findAll(),
      this.collectionsRepository.countProductsByCollection(),
    ]);
    return rows.map((row) => ({ ...row, productCount: productCounts.get(row.id) ?? 0 }));
  }

  async findOne(id: string): Promise<AdminCollection> {
    const row: CollectionRecord = await this.getExisting(id);
    return { ...row, productCount: await this.collectionsRepository.countProducts(id) };
  }

  /**
   * Throws 404 COLLECTION_NOT_FOUND unless the collection exists.
   */
  async assertExists(id: string): Promise<void> {
    await this.getExisting(id);
  }

  async create(dto: CreateCollectionDto): Promise<AdminCollection> {
    const slug: string = resolveSlug({ slug: dto.slug, name: dto.name, maxLength: SLUG_MAX_LENGTH });
    await this.assertSlugAvailable({ slug });
    const created: CollectionRecord = await this.collectionsRepository.create(Object.assign({}, dto, { slug }));
    return this.findOne(created.id);
  }

  async update({ id, dto }: { id: string; dto: UpdateCollectionDto }): Promise<AdminCollection> {
    rejectNullFields({ dto, requiredKeys: ['name', 'slug', 'sortOrder', 'isPublished'] });
    const current: CollectionRecord = await this.getExisting(id);
    const isSlugChanged: boolean = dto.slug !== undefined && dto.slug !== current.slug;
    if (isSlugChanged) {
      await this.assertSlugAvailable({ slug: dto.slug as string, ignoreId: id });
    }
    if (Object.keys(dto).length > 0) {
      await this.collectionsRepository.update({ id, values: dto });
    }
    if (isSlugChanged) {
      await this.slugRedirectService.recordChange({
        entity: 'collection',
        oldSlug: current.slug,
        newSlug: dto.slug as string,
        targetId: id,
      });
    }
    return this.findOne(id);
  }

  /**
   * Deletes a collection that has no products.
   */
  async remove(id: string): Promise<void> {
    await this.getExisting(id);
    const productCount: number = await this.collectionsRepository.countProducts(id);
    if (productCount > 0) {
      throw new AppException(ErrorCode.COLLECTION_NOT_EMPTY, HttpStatus.CONFLICT, 'Collection has products', {
        productCount,
      });
    }
    await this.collectionsRepository.delete(id);
    await this.slugRedirectService.removeForTarget({ entity: 'collection', targetId: id });
  }

  private async getExisting(id: string): Promise<CollectionRecord> {
    const row: CollectionRecord | undefined = await this.collectionsRepository.findById(id);
    if (!row) {
      throw new AppException(ErrorCode.COLLECTION_NOT_FOUND, HttpStatus.NOT_FOUND, 'Collection not found');
    }
    return row;
  }

  private async assertSlugAvailable({ slug, ignoreId }: { slug: string; ignoreId?: string }): Promise<void> {
    const existing: CollectionRecord | undefined = await this.collectionsRepository.findBySlug(slug);
    if (existing && existing.id !== ignoreId) {
      throw new AppException(ErrorCode.SLUG_TAKEN, HttpStatus.CONFLICT, 'Collection slug is already used', { slug });
    }
  }
}
