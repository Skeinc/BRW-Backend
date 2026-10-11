import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.js';
import { rejectNullFields } from '../../common/lib/reject-null-fields.js';
import { resolveSlug } from '../../common/lib/resolve-slug.js';
import { toPage } from '../../common/lib/pagination.js';
import type { Page } from '../../common/lib/pagination.types.js';
import { StorageService } from '../../common/storage/storage.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import { CollectionsService } from '../collections/collections.service.js';
import { SlugRedirectService } from '../seo/slug-redirect.service.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type { ListProductsQueryDto } from './dto/list-products-query.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductImagesService } from './images/product-images.service.js';
import { ProductsRepository } from './products.repository.js';
import type {
  AdminProduct,
  AdminProductListItem,
  ProductListFilters,
  ProductListRow,
  ProductRecord,
} from './products.types.js';

const SLUG_MAX_LENGTH = 160;
const REQUIRED_KEYS: (keyof UpdateProductDto)[] = [
  'categoryId',
  'name',
  'slug',
  'sku',
  'price',
  'stockStatus',
  'attributes',
  'isPublished',
];

/**
 * Business rules of products: references, unique slug and article number, slug redirects, safe deletion.
 */
@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly productImagesService: ProductImagesService,
    private readonly categoriesService: CategoriesService,
    private readonly collectionsService: CollectionsService,
    private readonly slugRedirectService: SlugRedirectService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * One page of products, published or not, filtered by category (with subcategories), collection and search text.
   */
  async findPage(query: ListProductsQueryDto): Promise<Page<AdminProductListItem>> {
    const filters: ProductListFilters = await this.buildFilters(query);
    const params = { page: query.page, pageSize: query.pageSize };
    const [rows, total] = await Promise.all([
      this.productsRepository.findPage({ filters, params }),
      this.productsRepository.count(filters),
    ]);
    return toPage({ items: rows.map((row) => this.toListItem(row)), total, params });
  }

  async findOne(id: string): Promise<AdminProduct> {
    const row = await this.productsRepository.findDetailById(id);
    if (!row) {
      throw this.buildNotFound();
    }
    return { ...row, images: await this.productImagesService.findByProduct(id) };
  }

  async create(dto: CreateProductDto): Promise<AdminProduct> {
    await this.assertReferencesExist(dto);
    const slug: string = resolveSlug({ slug: dto.slug, name: dto.name, maxLength: SLUG_MAX_LENGTH });
    await this.assertSlugAvailable({ slug });
    await this.assertSkuAvailable({ sku: dto.sku });
    const created: ProductRecord = await this.productsRepository.create(Object.assign({}, dto, { slug }));
    return this.findOne(created.id);
  }

  async update({ id, dto }: { id: string; dto: UpdateProductDto }): Promise<AdminProduct> {
    rejectNullFields({ dto, requiredKeys: REQUIRED_KEYS });
    const current: ProductRecord | undefined = await this.productsRepository.findById(id);
    if (!current) {
      throw this.buildNotFound();
    }
    await this.assertReferencesExist(dto);
    const isSlugChanged: boolean = dto.slug !== undefined && dto.slug !== current.slug;
    if (isSlugChanged) {
      await this.assertSlugAvailable({ slug: dto.slug as string, ignoreId: id });
    }
    if (dto.sku !== undefined && dto.sku !== current.sku) {
      await this.assertSkuAvailable({ sku: dto.sku, ignoreId: id });
    }
    if (Object.keys(dto).length > 0) {
      await this.productsRepository.update({ id, values: dto });
    }
    if (isSlugChanged) {
      await this.slugRedirectService.recordChange({
        entity: 'product',
        oldSlug: current.slug,
        newSlug: dto.slug as string,
        targetId: id,
      });
    }
    return this.findOne(id);
  }

  /**
   * Deletes the product and its photos. Products that appear in an order request are kept.
   */
  async remove(id: string): Promise<void> {
    if (!(await this.productsRepository.findById(id))) {
      throw this.buildNotFound();
    }
    const orderItemCount: number = await this.productsRepository.countOrderItems(id);
    if (orderItemCount > 0) {
      throw new AppException(
        ErrorCode.PRODUCT_HAS_ORDERS,
        HttpStatus.CONFLICT,
        'Product is part of order requests, unpublish it instead',
        { orderItemCount },
      );
    }
    const keys: string[] = await this.productImagesService.listKeys(id);
    await this.productsRepository.delete(id);
    await this.slugRedirectService.removeForTarget({ entity: 'product', targetId: id });
    await this.productImagesService.deleteFiles(keys);
  }

  private async buildFilters(query: ListProductsQueryDto): Promise<ProductListFilters> {
    const categoryIds: string[] | undefined = query.categoryId
      ? await this.categoriesService.findSelfAndDescendantIds(query.categoryId)
      : undefined;
    return { categoryIds, collectionId: query.collectionId, q: query.q?.trim() };
  }

  private async assertReferencesExist(dto: Pick<UpdateProductDto, 'categoryId' | 'collectionId'>): Promise<void> {
    if (dto.categoryId) {
      await this.categoriesService.assertExists(dto.categoryId);
    }
    if (dto.collectionId) {
      await this.collectionsService.assertExists(dto.collectionId);
    }
  }

  private async assertSlugAvailable({ slug, ignoreId }: { slug: string; ignoreId?: string }): Promise<void> {
    const existing: ProductRecord | undefined = await this.productsRepository.findBySlug(slug);
    if (existing && existing.id !== ignoreId) {
      throw new AppException(ErrorCode.SLUG_TAKEN, HttpStatus.CONFLICT, 'Product slug is already used', { slug });
    }
  }

  private async assertSkuAvailable({ sku, ignoreId }: { sku: string; ignoreId?: string }): Promise<void> {
    const existing: ProductRecord | undefined = await this.productsRepository.findBySku(sku);
    if (existing && existing.id !== ignoreId) {
      throw new AppException(ErrorCode.SKU_TAKEN, HttpStatus.CONFLICT, 'Product article number is already used', {
        sku,
      });
    }
  }

  private buildNotFound(): AppException {
    return new AppException(ErrorCode.PRODUCT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Product not found');
  }

  private toListItem({ coverKey, ...row }: ProductListRow): AdminProductListItem {
    return { ...row, coverUrl: coverKey ? this.storageService.getPublicUrl(coverKey) : null };
  }
}
