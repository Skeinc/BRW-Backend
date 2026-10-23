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
import { CATEGORY_SLUG_MAX_LENGTH, MAX_CATEGORY_DEPTH } from './constants/categories.constants.js';
import { CategoriesRepository } from './categories.repository.js';
import type {
  CategoryDetailView,
  CategoryBreadcrumb,
  CategoryNode,
  CategoryPatch,
  CategoryRecord,
  CategoryView,
  PublicCategoryDetail,
  PublicCategoryNode,
} from './types/categories.types.js';
import { buildCategoryBreadcrumbs } from './lib/build-category-breadcrumbs.js';
import { buildPublicCategoryTree } from './lib/build-public-category-tree.js';
import { CategoryTree } from './lib/category-tree.js';
import { filterVisibleCategories } from './lib/filter-visible-categories.js';
import { findCategoryNode } from './lib/find-category-node.js';
import type { CreateCategoryDto } from './dto/create-category.dto.js';
import type { ListCategoriesQueryDto } from './dto/list-categories-query.dto.js';
import type { UpdateCategoryDto } from './dto/update-category.dto.js';

const NULLABLE_FIELDS: readonly string[] = ['parentId', 'description', 'seoTitle', 'seoDescription'];

/** Business rules of the category tree: depth limit, unique slugs, slug redirects, safe deletion. */
@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly slugRedirectsService: SlugRedirectsService,
    private readonly mediaService: MediaService,
  ) {}

  /**
   * One page of the tree: exactly `pageSize` rows of the flat tree order (parents first), after the search
   * and filters, so `total` is the number of rows. A branch can continue on the next page. The tree is a few
   * dozen rows, so it is filtered and paged in memory.
   */
  async list(query: ListCategoriesQueryDto): Promise<PaginatedResult<CategoryView>> {
    const { page, pageSize } = query;
    const matching: CategoryNode[] = this.filterNodes({ nodes: await this.loadTree(), query });
    const pageNodes: CategoryNode[] = matching.slice((page - 1) * pageSize, page * pageSize);
    const items: CategoryView[] = await this.attachCovers(pageNodes);
    return buildPaginatedResult({ items, page, pageSize, total: matching.length });
  }

  /** Storefront tree: published categories only (a hidden parent hides its branch), with subtree product counts. */
  async listPublic(): Promise<PublicCategoryNode[]> {
    const { roots } = await this.loadPublicTree();
    return roots;
  }

  /** One published category with its subtree and breadcrumbs; fails with 404 CATEGORY_NOT_FOUND. */
  async getPublic(id: string): Promise<PublicCategoryDetail> {
    const { roots, visible } = await this.loadPublicTree();
    const node: PublicCategoryNode | undefined = findCategoryNode({ nodes: roots, id });
    const record: CategoryRecord | undefined = visible.find((candidate) => candidate.id === id);
    if (node === undefined || record === undefined) {
      throw new AppException(ErrorCode.CATEGORY_NOT_FOUND, HttpStatus.NOT_FOUND, 'Category not found');
    }
    return {
      ...node,
      description: record.description,
      seoTitle: record.seoTitle,
      seoDescription: record.seoDescription,
      breadcrumbs: buildCategoryBreadcrumbs({ records: visible, id }),
    };
  }

  /** Path from the root to a category, for the breadcrumbs of its products; empty when the id is unknown. */
  async getBreadcrumbs(id: string): Promise<CategoryBreadcrumb[]> {
    return buildCategoryBreadcrumbs({ records: await this.categoriesRepository.findAll(), id });
  }

  /** The whole tree as a flat list in tree order: for parent pickers, where every category is needed. */
  async listTree(): Promise<CategoryView[]> {
    return this.attachCovers(await this.loadTree());
  }

  /** Puts a category where `overId` is now; both must have the same parent. */
  async move({ id, overId }: { id: string; overId: string }): Promise<void> {
    const records: CategoryRecord[] = await this.categoriesRepository.findAll();
    const active: CategoryRecord | undefined = records.find((record) => record.id === id);
    const over: CategoryRecord | undefined = records.find((record) => record.id === overId);
    if (active === undefined || over === undefined) {
      throw new AppException(ErrorCode.CATEGORY_NOT_FOUND, HttpStatus.NOT_FOUND, 'Category not found');
    }
    if (active.parentId !== over.parentId) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST,
        'Categories can only be reordered among siblings',
      );
    }
    const siblings: CategoryRecord[] = records.filter((record) => record.parentId === active.parentId);
    const ordered: CategoryRecord[] = moveItem({ items: siblings, id, overId });
    await this.categoriesRepository.applySortOrders(planSortOrders(ordered));
  }

  /** One category; fails with 404 CATEGORY_NOT_FOUND. */
  async get(id: string): Promise<CategoryDetailView> {
    const record: CategoryRecord = await this.getRecordOrThrow(id);
    return this.toView(record);
  }

  /** Creates a category, checking the depth limit and slug uniqueness. */
  async create(dto: CreateCategoryDto): Promise<CategoryDetailView> {
    const { slug: explicitSlug, parentId = null, ...fields } = dto;
    const slug: string = resolveSlugCandidate({
      name: dto.name,
      slug: explicitSlug,
      maxLength: CATEGORY_SLUG_MAX_LENGTH,
    });
    await this.assertSlugAvailable({ slug });
    if (parentId !== null) {
      await this.assertCanPlaceUnder({ parentId });
    }
    const sortOrder: number = fields.sortOrder ?? (await this.categoriesRepository.nextSortOrder(parentId));
    try {
      const record: CategoryRecord = await this.categoriesRepository.insert({ ...fields, slug, parentId, sortOrder });
      await this.slugRedirectsService.release({ entity: 'category', slug });
      return await this.toView(record);
    } catch (err) {
      throw isUniqueViolation(err) ? new SlugTakenException(slug) : err;
    }
  }

  /** Updates a category. A changed slug is stored in `slug_redirect`; moving checks depth and cycles. */
  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDetailView> {
    assertNoNullFields({ dto, nullableFields: NULLABLE_FIELDS });
    const existing: CategoryRecord = await this.getRecordOrThrow(id);
    const patch: CategoryPatch = Object.assign({}, dto);
    if (dto.parentId !== undefined && dto.parentId !== existing.parentId) {
      await this.assertCanMove({ id, parentId: dto.parentId });
      patch.sortOrder ??= await this.categoriesRepository.nextSortOrder(dto.parentId ?? null);
    }
    const isSlugChanged: boolean = dto.slug !== undefined && dto.slug !== existing.slug;
    if (isSlugChanged && dto.slug !== undefined) {
      await this.assertSlugAvailable({ slug: dto.slug, excludeId: id });
    }
    if (!hasDefinedValues(patch)) {
      return this.toView(existing);
    }
    let updated: CategoryRecord;
    try {
      updated = await this.categoriesRepository.update({ id, patch });
    } catch (err) {
      throw isUniqueViolation(err) && dto.slug !== undefined ? new SlugTakenException(dto.slug) : err;
    }
    if (isSlugChanged) {
      await this.slugRedirectsService.recordChange({ entity: 'category', oldSlug: existing.slug, targetId: id });
      await this.slugRedirectsService.release({ entity: 'category', slug: updated.slug });
    }
    return this.toView(updated);
  }

  /** Deletes an empty category; fails with 409 CATEGORY_NOT_EMPTY when it has children or products. */
  async remove(id: string): Promise<void> {
    await this.getRecordOrThrow(id);
    const [childCount, productCount] = await Promise.all([
      this.categoriesRepository.countChildren(id),
      this.categoriesRepository.countProducts(id),
    ]);
    if (childCount > 0 || productCount > 0) {
      throw new AppException(
        ErrorCode.CATEGORY_NOT_EMPTY,
        HttpStatus.CONFLICT,
        'Category has subcategories or products',
        {
          childCount,
          productCount,
        },
      );
    }
    await this.categoriesRepository.delete(id);
    await this.slugRedirectsService.removeForTarget({ entity: 'category', targetId: id });
    await this.mediaService.removeAllImages({ entityType: 'category', entityId: id });
  }

  /** Throws 404 CATEGORY_NOT_FOUND unless the category exists. Used by modules that attach products. */
  async assertExists(id: string): Promise<void> {
    await this.getRecordOrThrow(id);
  }

  private async getRecordOrThrow(id: string): Promise<CategoryRecord> {
    const record: CategoryRecord | undefined = await this.categoriesRepository.findById(id);
    if (record === undefined) {
      throw new AppException(ErrorCode.CATEGORY_NOT_FOUND, HttpStatus.NOT_FOUND, 'Category not found');
    }
    return record;
  }

  /** Every category in tree order with depth, child and product counts, but without covers. */
  private async loadTree(): Promise<CategoryNode[]> {
    const [records, counts] = await Promise.all([
      this.categoriesRepository.findAll(),
      this.categoriesRepository.countProductsByCategory(),
    ]);
    const tree: CategoryTree = new CategoryTree(records);
    return tree.toOrderedList().map(({ record, depth }) => ({
      ...record,
      depth,
      childCount: tree.getChildCount(record.id),
      productCount: counts.get(record.id) ?? 0,
    }));
  }

  private async loadPublicTree(): Promise<{ roots: PublicCategoryNode[]; visible: CategoryRecord[] }> {
    const [records, directCounts] = await Promise.all([
      this.categoriesRepository.findAll(),
      this.categoriesRepository.countPublishedProductsByCategory(),
    ]);
    const visible: CategoryRecord[] = filterVisibleCategories(records);
    const covers = await this.mediaService.getCovers({
      entityType: 'category',
      entityIds: visible.map((record) => record.id),
    });
    const imageUrls = new Map([...covers].map(([id, cover]) => [id, cover.url]));
    return { roots: buildPublicCategoryTree({ records: visible, directCounts, imageUrls }), visible };
  }

  private filterNodes({ nodes, query }: { nodes: CategoryNode[]; query: ListCategoriesQueryDto }): CategoryNode[] {
    const { q, isPublished, depth } = query;
    const needle: string | undefined = q?.toLowerCase();
    return nodes.filter(
      (node) =>
        (needle === undefined || node.name.toLowerCase().includes(needle)) &&
        (isPublished === undefined || node.isPublished === isPublished) &&
        (depth === undefined || node.depth === depth),
    );
  }

  private async attachCovers(nodes: CategoryNode[]): Promise<CategoryView[]> {
    const covers = await this.mediaService.getCovers({
      entityType: 'category',
      entityIds: nodes.map((node) => node.id),
    });
    return nodes.map((node) => ({ ...node, cover: covers.get(node.id) ?? null }));
  }

  private async toView(record: CategoryRecord): Promise<CategoryDetailView> {
    const [records, productCount, images] = await Promise.all([
      this.categoriesRepository.findAll(),
      this.categoriesRepository.countProducts(record.id),
      this.mediaService.listImages({ entityType: 'category', entityId: record.id }),
    ]);
    const tree: CategoryTree = new CategoryTree(records);
    return {
      ...record,
      depth: tree.getDepth(record.id),
      childCount: tree.getChildCount(record.id),
      productCount,
      cover: getCover(images),
      images,
    };
  }

  private async assertSlugAvailable({ slug, excludeId }: { slug: string; excludeId?: string }): Promise<void> {
    const owner: CategoryRecord | undefined = await this.categoriesRepository.findBySlug(slug);
    if (owner !== undefined && owner.id !== excludeId) {
      throw new SlugTakenException(slug);
    }
  }

  private async assertCanPlaceUnder({ parentId }: { parentId: string }): Promise<void> {
    const tree = new CategoryTree(await this.categoriesRepository.findAll());
    const parentDepth: number = tree.getDepth(parentId);
    if (parentDepth === 0) {
      throw new AppException(ErrorCode.CATEGORY_NOT_FOUND, HttpStatus.NOT_FOUND, 'Parent category not found');
    }
    if (parentDepth + 1 > MAX_CATEGORY_DEPTH) {
      throw this.buildDepthException();
    }
  }

  private async assertCanMove({ id, parentId }: { id: string; parentId: string | null | undefined }): Promise<void> {
    if (parentId === null || parentId === undefined) {
      return;
    }
    const tree = new CategoryTree(await this.categoriesRepository.findAll());
    const parentDepth: number = tree.getDepth(parentId);
    if (parentDepth === 0) {
      throw new AppException(ErrorCode.CATEGORY_NOT_FOUND, HttpStatus.NOT_FOUND, 'Parent category not found');
    }
    if (tree.isSelfOrDescendant({ candidateId: parentId, ancestorId: id })) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST,
        'A category cannot be moved under itself',
      );
    }
    if (parentDepth + tree.getHeight(id) > MAX_CATEGORY_DEPTH) {
      throw this.buildDepthException();
    }
  }

  private buildDepthException(): AppException {
    return new AppException(
      ErrorCode.CATEGORY_DEPTH_EXCEEDED,
      HttpStatus.UNPROCESSABLE_ENTITY,
      `Categories can be nested at most ${MAX_CATEGORY_DEPTH} levels deep`,
    );
  }
}
