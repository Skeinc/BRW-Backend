import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.js';
import { rejectNullFields } from '../../common/lib/reject-null-fields.js';
import { resolveSlug } from '../../common/lib/resolve-slug.js';
import { SlugRedirectService } from '../seo/slug-redirect.service.js';
import { CategoriesRepository } from './categories.repository.js';
import type { AdminCategory, CategoryRecord } from './categories.types.js';
import { CategoryTree, MAX_CATEGORY_LEVELS } from './category-tree.js';
import type { CreateCategoryDto } from './dto/create-category.dto.js';
import type { UpdateCategoryDto } from './dto/update-category.dto.js';

const SLUG_MAX_LENGTH = 120;

/**
 * Business rules of the category tree: depth limit, unique slugs, slug redirects and safe deletion.
 */
@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly slugRedirectService: SlugRedirectService,
  ) {}

  /**
   * All categories, published or not, with their level and own product count.
   */
  async findAll(): Promise<AdminCategory[]> {
    const [rows, productCounts, nodes] = await Promise.all([
      this.categoriesRepository.findAll(),
      this.categoriesRepository.countProductsByCategory(),
      this.categoriesRepository.findAllNodes(),
    ]);
    const tree = new CategoryTree(nodes);
    return rows.map((row) => ({ ...row, level: tree.getLevel(row.id), productCount: productCounts.get(row.id) ?? 0 }));
  }

  async findOne(id: string): Promise<AdminCategory> {
    const row: CategoryRecord = await this.getExisting(id);
    const [productCount, nodes] = await Promise.all([
      this.categoriesRepository.countProducts(id),
      this.categoriesRepository.findAllNodes(),
    ]);
    return { ...row, level: new CategoryTree(nodes).getLevel(id), productCount };
  }

  /**
   * Ids of the category and everything below it. Used by product filters.
   */
  async findSelfAndDescendantIds(id: string): Promise<string[]> {
    await this.getExisting(id);
    const tree = new CategoryTree(await this.categoriesRepository.findAllNodes());
    return [id, ...tree.getDescendantIds(id)];
  }

  /**
   * Throws 404 CATEGORY_NOT_FOUND unless the category exists.
   */
  async assertExists(id: string): Promise<void> {
    await this.getExisting(id);
  }

  async create(dto: CreateCategoryDto): Promise<AdminCategory> {
    if (dto.parentId) {
      await this.assertCanHaveChildAt({ parentId: dto.parentId, subtreeHeight: 1 });
    }
    const slug: string = resolveSlug({ slug: dto.slug, name: dto.name, maxLength: SLUG_MAX_LENGTH });
    await this.assertSlugAvailable({ slug });
    const created: CategoryRecord = await this.categoriesRepository.create(Object.assign({}, dto, { slug }));
    return this.findOne(created.id);
  }

  async update({ id, dto }: { id: string; dto: UpdateCategoryDto }): Promise<AdminCategory> {
    rejectNullFields({ dto, requiredKeys: ['name', 'slug', 'sortOrder', 'isPublished'] });
    const current: CategoryRecord = await this.getExisting(id);
    if (dto.parentId !== undefined && dto.parentId !== current.parentId) {
      await this.assertCanMove({ id, parentId: dto.parentId });
    }
    const isSlugChanged: boolean = dto.slug !== undefined && dto.slug !== current.slug;
    if (isSlugChanged) {
      await this.assertSlugAvailable({ slug: dto.slug as string, ignoreId: id });
    }
    if (Object.keys(dto).length > 0) {
      await this.categoriesRepository.update({ id, values: dto });
    }
    if (isSlugChanged) {
      await this.slugRedirectService.recordChange({
        entity: 'category',
        oldSlug: current.slug,
        newSlug: dto.slug as string,
        targetId: id,
      });
    }
    return this.findOne(id);
  }

  /**
   * Deletes a category that has no children and no products.
   */
  async remove(id: string): Promise<void> {
    await this.getExisting(id);
    const [childCount, productCount] = await Promise.all([
      this.categoriesRepository.countChildren(id),
      this.categoriesRepository.countProducts(id),
    ]);
    if (childCount > 0 || productCount > 0) {
      throw new AppException(
        ErrorCode.CATEGORY_NOT_EMPTY,
        HttpStatus.CONFLICT,
        'Category has subcategories or products',
        { childCount, productCount },
      );
    }
    await this.categoriesRepository.delete(id);
    await this.slugRedirectService.removeForTarget({ entity: 'category', targetId: id });
  }

  private async getExisting(id: string): Promise<CategoryRecord> {
    const row: CategoryRecord | undefined = await this.categoriesRepository.findById(id);
    if (!row) {
      throw new AppException(ErrorCode.CATEGORY_NOT_FOUND, HttpStatus.NOT_FOUND, 'Category not found');
    }
    return row;
  }

  private async assertSlugAvailable({ slug, ignoreId }: { slug: string; ignoreId?: string }): Promise<void> {
    const existing: CategoryRecord | undefined = await this.categoriesRepository.findBySlug(slug);
    if (existing && existing.id !== ignoreId) {
      throw new AppException(ErrorCode.SLUG_TAKEN, HttpStatus.CONFLICT, 'Category slug is already used', { slug });
    }
  }

  /**
   * A subtree of `subtreeHeight` levels fits under `parentId` only if the result stays within the level limit.
   */
  private async assertCanHaveChildAt({
    parentId,
    subtreeHeight,
  }: {
    parentId: string;
    subtreeHeight: number;
  }): Promise<void> {
    await this.getExisting(parentId);
    const tree = new CategoryTree(await this.categoriesRepository.findAllNodes());
    if (tree.getLevel(parentId) + subtreeHeight > MAX_CATEGORY_LEVELS) {
      throw new AppException(
        ErrorCode.CATEGORY_DEPTH_EXCEEDED,
        HttpStatus.UNPROCESSABLE_ENTITY,
        `Categories can be nested at most ${MAX_CATEGORY_LEVELS} levels deep`,
      );
    }
  }

  private async assertCanMove({ id, parentId }: { id: string; parentId: string | null }): Promise<void> {
    if (parentId === null) {
      return;
    }
    const nodes = await this.categoriesRepository.findAllNodes();
    const tree = new CategoryTree(nodes);
    if (parentId === id || tree.getDescendantIds(id).includes(parentId)) {
      throw new AppException(
        ErrorCode.CATEGORY_CYCLE,
        HttpStatus.UNPROCESSABLE_ENTITY,
        'A category cannot be moved under itself or its own subcategory',
      );
    }
    await this.assertCanHaveChildAt({ parentId, subtreeHeight: tree.getHeight(id) });
  }
}
