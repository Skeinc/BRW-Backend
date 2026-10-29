import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../../common/errors/app.exception.js';
import { ErrorCode } from '../../../common/errors/error-code.js';
import { assertNoNullFields } from '../../../common/lib/assert-no-null-fields.js';
import { buildPaginatedResult } from '../../../common/lib/build-paginated-result.js';
import { hasDefinedValues } from '../../../common/lib/has-defined-values.js';
import type { PaginatedResult } from '../../../common/lib/pagination.types.js';
import { moveItem, planSortOrders } from '../../../common/lib/reorder-items.js';
import { getCover } from '../../media/lib/get-cover.js';
import { MediaService } from '../../media/media.service.js';
import type { CreateRoomDto } from '../dto/create-room.dto.js';
import type { ListRoomsQueryDto } from '../dto/list-rooms-query.dto.js';
import type { UpdateRoomDto } from '../dto/update-room.dto.js';
import type { RoomDetailView, RoomPatch, RoomView } from '../types/admin-rooms.types.js';
import type { RoomRecord } from '../types/rooms.types.js';
import { AdminRoomsRepository } from './admin-rooms.repository.js';

const NULLABLE_FIELDS: readonly string[] = ['description', 'seoTitle', 'seoDescription'];

/** Business rules of rooms in the admin: order, publication and photos. */
@Injectable()
export class AdminRoomsService {
  constructor(
    private readonly roomsRepository: AdminRoomsRepository,
    private readonly mediaService: MediaService,
  ) {}

  /** One page of rooms by sort order with covers and solution counts. */
  async list(query: ListRoomsQueryDto): Promise<PaginatedResult<RoomView>> {
    const { page, pageSize } = query;
    const records: RoomRecord[] = await this.roomsRepository.findAll();
    const pageRecords: RoomRecord[] = records.slice((page - 1) * pageSize, page * pageSize);
    const covers = await this.mediaService.getCovers({
      entityType: 'room',
      entityIds: pageRecords.map((record) => record.id),
    });
    const counts: Map<string, number> = await this.roomsRepository.countSolutions();
    const items: RoomView[] = pageRecords.map((record) => ({
      ...record,
      cover: covers.get(record.id) ?? null,
      solutionCount: counts.get(record.id) ?? 0,
    }));
    return buildPaginatedResult({ items, page, pageSize, total: records.length });
  }

  /** One room with its gallery; fails with 404 ROOM_NOT_FOUND. */
  async get(id: string): Promise<RoomDetailView> {
    return this.toDetail(await this.getRecordOrThrow(id));
  }

  /** Creates a room at the end of the list. */
  async create(dto: CreateRoomDto): Promise<RoomDetailView> {
    const sortOrder: number = await this.roomsRepository.nextSortOrder();
    const { name, description, seoTitle, seoDescription, isPublished } = dto;
    const record: RoomRecord = await this.roomsRepository.insert({
      name,
      description,
      seoTitle,
      seoDescription,
      isPublished,
      sortOrder,
    });
    return this.toDetail(record);
  }

  /** Updates a room; `null` clears a text field. */
  async update(id: string, dto: UpdateRoomDto): Promise<RoomDetailView> {
    assertNoNullFields({ dto, nullableFields: NULLABLE_FIELDS });
    const existing: RoomRecord = await this.getRecordOrThrow(id);
    const patch: RoomPatch = Object.assign({}, dto);
    if (!hasDefinedValues(patch)) {
      return this.toDetail(existing);
    }
    return this.toDetail(await this.roomsRepository.update({ id, patch }));
  }

  /** Puts a room where `overId` is now and shifts the ones in between. */
  async move({ id, overId }: { id: string; overId: string }): Promise<void> {
    const records: RoomRecord[] = await this.roomsRepository.findAll();
    if (!records.some((record) => record.id === id) || !records.some((record) => record.id === overId)) {
      throw new AppException(ErrorCode.ROOM_NOT_FOUND, HttpStatus.NOT_FOUND, 'Room not found');
    }
    const ordered: RoomRecord[] = moveItem({ items: records, id, overId });
    await this.roomsRepository.applySortOrders(planSortOrders(ordered));
  }

  /** Deletes an empty room with its photos; fails with 409 ROOM_NOT_EMPTY while it has solutions. */
  async remove(id: string): Promise<void> {
    await this.getRecordOrThrow(id);
    if ((await this.roomsRepository.countSolutionsOf(id)) > 0) {
      throw new AppException(ErrorCode.ROOM_NOT_EMPTY, HttpStatus.CONFLICT, 'Room still has solutions');
    }
    await this.roomsRepository.delete(id);
    await this.mediaService.removeAllImages({ entityType: 'room', entityId: id });
  }

  private async getRecordOrThrow(id: string): Promise<RoomRecord> {
    const record: RoomRecord | undefined = await this.roomsRepository.findById(id);
    if (record === undefined) {
      throw new AppException(ErrorCode.ROOM_NOT_FOUND, HttpStatus.NOT_FOUND, 'Room not found');
    }
    return record;
  }

  private async toDetail(record: RoomRecord): Promise<RoomDetailView> {
    const images = await this.mediaService.listImages({ entityType: 'room', entityId: record.id });
    const solutionCount: number = await this.roomsRepository.countSolutionsOf(record.id);
    return { ...record, cover: getCover(images), solutionCount, images };
  }
}
