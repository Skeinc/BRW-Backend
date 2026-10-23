import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.js';
import { SlugTakenException } from '../../common/errors/slug-taken.exception.js';
import { assertNoNullFields } from '../../common/lib/assert-no-null-fields.js';
import { buildPaginatedResult } from '../../common/lib/build-paginated-result.js';
import { hasDefinedValues } from '../../common/lib/has-defined-values.js';
import { getUniqueViolationConstraint } from '../../common/lib/get-unique-violation-constraint.js';
import { resolveSlugCandidate } from '../../common/lib/resolve-slug-candidate.js';
import type { PaginatedResult } from '../../common/lib/pagination.types.js';
import { calculateDiscountPercent } from '../../common/lib/calculate-discount-percent.js';
import { CategoriesService } from '../categories/categories.service.js';
import { CollectionsService } from '../collections/collections.service.js';
import { MediaService } from '../media/media.service.js';
import { SlugRedirectsService } from '../slug-redirects/slug-redirects.service.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type { ListProductsQueryDto } from './dto/list-products-query.dto.js';
import type { ListPublicProductsQueryDto } from './dto/list-public-products-query.dto.js';
import type { PublicProductFiltersDto } from './dto/public-product-filters.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';
import { PRODUCT_SLUG_MAX_LENGTH } from './constants/products.constants.js';
import { ProductsRepository } from './products.repository.js';
import type {
  ProductFacets,
  ProductListItem,
  ProductListRowsResult,
  ProductPatch,
  ProductRecord,
  ProductView,
  PublicProductDetail,
  PublicProductDetailRow,
  PublicProductListItem,
  PublicProductRowsResult,
} from './types/products.types.js';

const NULLABLE_FIELDS: readonly string[] = [
  'collectionId',
  'sku',
  'description',
  'oldPrice',
  'widthMm',
  'heightMm',
  'heightMaxMm',
  'depthMm',
  'lengthMm',
  'material',
  'colorBody',
  'colorFacade',
  'seoTitle',
  'seoDescription',
];
/** `restrict_violation` (ON DELETE RESTRICT) and `foreign_key_violation`. */
const REFERENCE_VIOLATION_CODES: readonly string[] = ['23001', '23503'];
const SKU_UNIQUE_CONSTRAINT = 'product_sku_unique';
const SLUG_UNIQUE_CONSTRAINT = 'product_slug_unique';

/** Business rules of products: references, unique slug and SKU, slug redirects, file cleanup on delete. */
@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly categoriesService: CategoriesService,
    private readonly collectionsService: CollectionsService,
    private readonly mediaService: MediaService,
    private readonly slugRedirectsService: SlugRedirectsService,
  ) {}

  /** A page of products including unpublished ones. */
  async list(query: ListProductsQueryDto): Promise<PaginatedResult<ProductListItem>> {
    const { rows, total }: ProductListRowsResult = await this.productsRepository.findPage(query);
    const covers = await this.mediaService.getCovers({ entityType: 'product', entityIds: rows.map((row) => row.id) });
    const items: ProductListItem[] = rows.map((row) => ({ ...row, cover: covers.get(row.id) ?? null }));
    return buildPaginatedResult({ items, page: query.page, pageSize: query.pageSize, total });
  }

  /** A page of published products matching the storefront filters and sort. */
  async listPublic(query: ListPublicProductsQueryDto): Promise<PaginatedResult<PublicProductListItem>> {
    const { sort, page, pageSize, ...filters } = query;
    const { rows, total }: PublicProductRowsResult = await this.productsRepository.findPublicPage({
      filters,
      sort,
      page,
      pageSize,
    });
    const covers = await this.mediaService.getCoverImages({
      entityType: 'product',
      entityIds: rows.map((row) => row.id),
    });
    const items: PublicProductListItem[] = rows.map((row) => ({
      ...row,
      discountPercent: calculateDiscountPercent(row),
      coverImage: covers.get(row.id) ?? null,
    }));
    return buildPaginatedResult({ items, page, pageSize, total });
  }

  /** Values available for each filter in the current selection. */
  async getFacets(filters: PublicProductFiltersDto): Promise<ProductFacets> {
    return this.productsRepository.findFacets(filters);
  }

  /** One published product; fails with 404 PRODUCT_NOT_FOUND for a missing or unpublished one. */
  async getPublic(id: string): Promise<PublicProductDetail> {
    const row: PublicProductDetailRow | undefined = await this.productsRepository.findPublishedDetail(id);
    if (row === undefined) {
      throw new AppException(ErrorCode.PRODUCT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Product not found');
    }
    const { record, category, collection } = row;
    const [images, breadcrumbs] = await Promise.all([
      this.mediaService.listImages({ entityType: 'product', entityId: id }),
      this.categoriesService.getBreadcrumbs(category.id),
    ]);
    return {
      id: record.id,
      slug: record.slug,
      sku: record.sku,
      name: record.name,
      description: record.description,
      price: record.price,
      oldPrice: record.oldPrice,
      discountPercent: calculateDiscountPercent(record),
      stockStatus: record.stockStatus,
      widthMm: record.widthMm,
      heightMm: record.heightMm,
      heightMaxMm: record.heightMaxMm,
      depthMm: record.depthMm,
      lengthMm: record.lengthMm,
      material: record.material,
      colorBody: record.colorBody,
      colorFacade: record.colorFacade,
      attributes: record.attributes,
      isHit: record.isHit,
      seoTitle: record.seoTitle,
      seoDescription: record.seoDescription,
      images,
      category,
      collection,
      breadcrumbs,
    };
  }

  /** Published products among the given ids, for building an order; others are absent from the result. */
  async findPublishedByIds(ids: string[]): Promise<ProductRecord[]> {
    return this.productsRepository.findPublishedByIds(ids);
  }

  /** One product with its photos; fails with 404 PRODUCT_NOT_FOUND. */
  async get(id: string): Promise<ProductView> {
    const record: ProductRecord = await this.getRecordOrThrow(id);
    return this.toView(record);
  }

  /** Creates a product (unpublished unless `isPublished` is true). */
  async create(dto: CreateProductDto): Promise<ProductView> {
    const { slug: explicitSlug, ...fields } = dto;
    await this.categoriesService.assertExists(dto.categoryId);
    if (dto.collectionId) {
      await this.collectionsService.assertExists(dto.collectionId);
    }
    const slug: string = resolveSlugCandidate({
      name: dto.name,
      slug: explicitSlug,
      maxLength: PRODUCT_SLUG_MAX_LENGTH,
    });
    await this.assertSlugAvailable({ slug });
    await this.assertSkuAvailable({ sku: dto.sku });
    try {
      const record: ProductRecord = await this.productsRepository.insert({ ...fields, sku: dto.sku || null, slug });
      await this.slugRedirectsService.release({ entity: 'product', slug });
      return await this.toView(record);
    } catch (err) {
      throw this.mapUniqueViolation({ err, slug, sku: dto.sku });
    }
  }

  /** Updates a product. A changed slug is stored in `slug_redirect`. */
  async update(id: string, dto: UpdateProductDto): Promise<ProductView> {
    assertNoNullFields({ dto, nullableFields: NULLABLE_FIELDS });
    const existing: ProductRecord = await this.getRecordOrThrow(id);
    if (dto.categoryId !== undefined && dto.categoryId !== existing.categoryId) {
      await this.categoriesService.assertExists(dto.categoryId);
    }
    if (dto.collectionId && dto.collectionId !== existing.collectionId) {
      await this.collectionsService.assertExists(dto.collectionId);
    }
    const isSlugChanged: boolean = dto.slug !== undefined && dto.slug !== existing.slug;
    if (isSlugChanged && dto.slug !== undefined) {
      await this.assertSlugAvailable({ slug: dto.slug, excludeId: id });
    }
    if (dto.sku && dto.sku !== existing.sku) {
      await this.assertSkuAvailable({ sku: dto.sku, excludeId: id });
    }
    const patch: ProductPatch = Object.assign({}, dto, dto.sku === '' ? { sku: null } : {});
    if (!hasDefinedValues(patch)) {
      return this.toView(existing);
    }
    let updated: ProductRecord;
    try {
      updated = await this.productsRepository.update({ id, patch });
    } catch (err) {
      throw this.mapUniqueViolation({ err, slug: dto.slug, sku: dto.sku });
    }
    if (isSlugChanged) {
      await this.slugRedirectsService.recordChange({ entity: 'product', oldSlug: existing.slug, targetId: id });
      await this.slugRedirectsService.release({ entity: 'product', slug: updated.slug });
    }
    return this.toView(updated);
  }

  /** Deletes a product, then its photo files (best effort). Fails with 409 PRODUCT_HAS_ORDERS if orders reference it. */
  async remove(id: string): Promise<void> {
    await this.getRecordOrThrow(id);
    try {
      await this.productsRepository.delete(id);
    } catch (err) {
      throw this.hasAnyCode({ err, codes: REFERENCE_VIOLATION_CODES })
        ? new AppException(
            ErrorCode.PRODUCT_HAS_ORDERS,
            HttpStatus.CONFLICT,
            'Product is part of order requests; unpublish it instead',
          )
        : err;
    }
    await this.slugRedirectsService.removeForTarget({ entity: 'product', targetId: id });
    await this.mediaService.removeAllImages({ entityType: 'product', entityId: id });
  }

  private async getRecordOrThrow(id: string): Promise<ProductRecord> {
    const record: ProductRecord | undefined = await this.productsRepository.findById(id);
    if (record === undefined) {
      throw new AppException(ErrorCode.PRODUCT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Product not found');
    }
    return record;
  }

  private async toView(record: ProductRecord): Promise<ProductView> {
    return { ...record, images: await this.mediaService.listImages({ entityType: 'product', entityId: record.id }) };
  }

  private async assertSlugAvailable({ slug, excludeId }: { slug: string; excludeId?: string }): Promise<void> {
    const owner: ProductRecord | undefined = await this.productsRepository.findBySlug(slug);
    if (owner !== undefined && owner.id !== excludeId) {
      throw new SlugTakenException(slug);
    }
  }

  private async assertSkuAvailable({ sku, excludeId }: { sku?: string | null; excludeId?: string }): Promise<void> {
    if (!sku) {
      return;
    }
    const owner: ProductRecord | undefined = await this.productsRepository.findBySku(sku);
    if (owner !== undefined && owner.id !== excludeId) {
      throw new AppException(ErrorCode.SKU_TAKEN, HttpStatus.CONFLICT, `SKU "${sku}" is already used`, { sku });
    }
  }

  /** Turns a race-condition unique violation into SLUG_TAKEN or SKU_TAKEN; any other error passes through unchanged. */
  private mapUniqueViolation({ err, slug, sku }: { err: unknown; slug?: string; sku?: string | null }): unknown {
    const constraint: string | undefined = getUniqueViolationConstraint(err);
    if (constraint === SKU_UNIQUE_CONSTRAINT) {
      return new AppException(ErrorCode.SKU_TAKEN, HttpStatus.CONFLICT, 'SKU is already used', { sku });
    }
    if (constraint === SLUG_UNIQUE_CONSTRAINT && slug !== undefined) {
      return new SlugTakenException(slug);
    }
    return err;
  }

  private hasAnyCode({ err, codes }: { err: unknown; codes: readonly string[] }): boolean {
    if (typeof err !== 'object' || err === null) {
      return false;
    }
    const { code, cause } = err as { code?: unknown; cause?: unknown };
    return (typeof code === 'string' && codes.includes(code)) || this.hasAnyCode({ err: cause, codes });
  }
}
