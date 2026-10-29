import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../../common/errors/app.exception.js';
import { ErrorCode } from '../../../common/errors/error-code.js';
import { assertNoNullFields } from '../../../common/lib/assert-no-null-fields.js';
import { buildPaginatedResult } from '../../../common/lib/build-paginated-result.js';
import type { PaginatedResult } from '../../../common/lib/pagination.types.js';
import { getCover } from '../../media/lib/get-cover.js';
import { MediaService } from '../../media/media.service.js';
import type { CreateSolutionDto } from '../dto/create-solution.dto.js';
import type { ListSolutionsQueryDto } from '../dto/list-solutions-query.dto.js';
import type { UpdateSolutionDto } from '../dto/update-solution.dto.js';
import type { SolutionDetailView, SolutionPatch, SolutionRow, SolutionView } from '../types/admin-rooms.types.js';
import { AdminSolutionsRepository } from './admin-solutions.repository.js';

const NULLABLE_FIELDS: readonly string[] = ['description'];

/** Business rules of ready-made solutions in the admin: links to room, collection and elements. */
@Injectable()
export class AdminSolutionsService {
  constructor(
    private readonly solutionsRepository: AdminSolutionsRepository,
    private readonly mediaService: MediaService,
  ) {}

  /** One filtered page of solutions with covers. */
  async list(query: ListSolutionsQueryDto): Promise<PaginatedResult<SolutionView>> {
    const { page, pageSize, q, roomId, collectionId } = query;
    const { rows, total } = await this.solutionsRepository.findPage({
      filters: { q, roomId, collectionId },
      page,
      pageSize,
    });
    const covers = await this.mediaService.getCovers({ entityType: 'solution', entityIds: rows.map((row) => row.id) });
    const items: SolutionView[] = rows.map((row) => ({ ...row, cover: covers.get(row.id) ?? null }));
    return buildPaginatedResult({ items, page, pageSize, total });
  }

  /** One solution with its gallery and elements; fails with 404 SOLUTION_NOT_FOUND. */
  async get(id: string): Promise<SolutionDetailView> {
    return this.toDetail(await this.getRowOrThrow(id));
  }

  /** Creates a solution at the end of its room; room, collection and products must exist. */
  async create(dto: CreateSolutionDto): Promise<SolutionDetailView> {
    const { productIds = [], roomId, collectionId, name, description, price, isPublished } = dto;
    await this.assertReferences({ roomId, collectionId, productIds });
    const sortOrder: number = await this.solutionsRepository.nextSortOrder(roomId);
    const id: string = await this.solutionsRepository.insert({
      values: { roomId, collectionId, name, description, price, isPublished, sortOrder },
      productIds,
    });
    return this.toDetail(await this.getRowOrThrow(id));
  }

  /** Updates a solution; `productIds` replaces the elements, `description: null` clears the text. */
  async update(id: string, dto: UpdateSolutionDto): Promise<SolutionDetailView> {
    assertNoNullFields({ dto, nullableFields: NULLABLE_FIELDS });
    const existing: SolutionRow = await this.getRowOrThrow(id);
    const { productIds, ...rest } = dto;
    const patch: SolutionPatch = Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== undefined));
    await this.assertReferences({ roomId: patch.roomId, collectionId: patch.collectionId, productIds });
    if (patch.roomId !== undefined && patch.roomId !== existing.roomId) {
      patch.sortOrder = await this.solutionsRepository.nextSortOrder(patch.roomId);
    }
    await this.solutionsRepository.update({ id, patch, productIds });
    return this.toDetail(await this.getRowOrThrow(id));
  }

  /** Deletes a solution together with its photos. */
  async remove(id: string): Promise<void> {
    await this.getRowOrThrow(id);
    await this.solutionsRepository.delete(id);
    await this.mediaService.removeAllImages({ entityType: 'solution', entityId: id });
  }

  private async assertReferences({
    roomId,
    collectionId,
    productIds,
  }: {
    roomId?: string;
    collectionId?: string;
    productIds?: string[];
  }): Promise<void> {
    if (
      roomId !== undefined &&
      (await this.solutionsRepository.findExistingIds({ table: 'room', ids: [roomId] })).length === 0
    ) {
      throw new AppException(ErrorCode.ROOM_NOT_FOUND, HttpStatus.NOT_FOUND, 'Room not found');
    }
    if (
      collectionId !== undefined &&
      (await this.solutionsRepository.findExistingIds({ table: 'collection', ids: [collectionId] })).length === 0
    ) {
      throw new AppException(ErrorCode.COLLECTION_NOT_FOUND, HttpStatus.NOT_FOUND, 'Collection not found');
    }
    if (productIds !== undefined) {
      const found = await this.solutionsRepository.findExistingIds({ table: 'product', ids: productIds });
      if (found.length !== productIds.length) {
        throw new AppException(ErrorCode.PRODUCT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Product not found');
      }
    }
  }

  private async getRowOrThrow(id: string): Promise<SolutionRow> {
    const row: SolutionRow | undefined = await this.solutionsRepository.findRowById(id);
    if (row === undefined) {
      throw new AppException(ErrorCode.SOLUTION_NOT_FOUND, HttpStatus.NOT_FOUND, 'Solution not found');
    }
    return row;
  }

  private async toDetail(row: SolutionRow): Promise<SolutionDetailView> {
    const images = await this.mediaService.listImages({ entityType: 'solution', entityId: row.id });
    const products = await this.solutionsRepository.findProducts(row.id);
    return { ...row, cover: getCover(images), images, products };
  }
}
