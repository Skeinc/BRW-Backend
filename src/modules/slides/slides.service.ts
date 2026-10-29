import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.js';
import { assertNoNullFields } from '../../common/lib/assert-no-null-fields.js';
import { buildPaginatedResult } from '../../common/lib/build-paginated-result.js';
import { hasDefinedValues } from '../../common/lib/has-defined-values.js';
import type { PaginatedResult } from '../../common/lib/pagination.types.js';
import { moveItem, planSortOrders } from '../../common/lib/reorder-items.js';
import { getCover } from '../media/lib/get-cover.js';
import { MediaService } from '../media/media.service.js';
import type { MediaCoverImage } from '../media/types/media.types.js';
import type { CreateSlideDto } from './dto/create-slide.dto.js';
import type { ListSlidesQueryDto } from './dto/list-slides-query.dto.js';
import type { UpdateSlideDto } from './dto/update-slide.dto.js';
import { SlidesRepository } from './slides.repository.js';
import type { PublicSlide, SlideDetailView, SlidePatch, SlideRecord, SlideView } from './types/slides.types.js';

const NULLABLE_FIELDS: readonly string[] = ['linkUrl'];

/** Business rules of home page slides: order, publication and the picture. */
@Injectable()
export class SlidesService {
  constructor(
    private readonly slidesRepository: SlidesRepository,
    private readonly mediaService: MediaService,
  ) {}

  /** One page of slides by sort order with their covers. */
  async list(query: ListSlidesQueryDto): Promise<PaginatedResult<SlideView>> {
    const { page, pageSize } = query;
    const records: SlideRecord[] = await this.slidesRepository.findAll();
    const pageRecords: SlideRecord[] = records.slice((page - 1) * pageSize, page * pageSize);
    const covers = await this.mediaService.getCovers({
      entityType: 'slide',
      entityIds: pageRecords.map((record) => record.id),
    });
    const items: SlideView[] = pageRecords.map((record) => ({ ...record, cover: covers.get(record.id) ?? null }));
    return buildPaginatedResult({ items, page, pageSize, total: records.length });
  }

  /** Published slides that have a picture, in sort order, for the storefront. */
  async listPublic(): Promise<PublicSlide[]> {
    const records: SlideRecord[] = (await this.slidesRepository.findAll()).filter((record) => record.isPublished);
    const covers: Map<string, MediaCoverImage> = await this.mediaService.getCoverImages({
      entityType: 'slide',
      entityIds: records.map((record) => record.id),
    });
    return records.flatMap((record) => {
      const image: MediaCoverImage | undefined = covers.get(record.id);
      return image === undefined
        ? []
        : [
            {
              id: record.id,
              alt: record.alt,
              linkUrl: record.linkUrl,
              image: { url: image.url, thumbUrl: image.thumbUrl, width: image.width, height: image.height },
            },
          ];
    });
  }

  /** One slide with its gallery; fails with 404 SLIDE_NOT_FOUND. */
  async get(id: string): Promise<SlideDetailView> {
    return this.toDetail(await this.getRecordOrThrow(id));
  }

  /** Creates a slide at the end of the list. */
  async create(dto: CreateSlideDto): Promise<SlideDetailView> {
    const sortOrder: number = await this.slidesRepository.nextSortOrder();
    const { alt, linkUrl, isPublished } = dto;
    const record: SlideRecord = await this.slidesRepository.insert({ alt, linkUrl, isPublished, sortOrder });
    return this.toDetail(record);
  }

  /** Updates a slide; `linkUrl: null` clears the link. */
  async update(id: string, dto: UpdateSlideDto): Promise<SlideDetailView> {
    assertNoNullFields({ dto, nullableFields: NULLABLE_FIELDS });
    const existing: SlideRecord = await this.getRecordOrThrow(id);
    const patch: SlidePatch = Object.assign({}, dto);
    if (!hasDefinedValues(patch)) {
      return this.toDetail(existing);
    }
    return this.toDetail(await this.slidesRepository.update({ id, patch }));
  }

  /** Puts a slide where `overId` is now and shifts the ones in between. */
  async move({ id, overId }: { id: string; overId: string }): Promise<void> {
    const records: SlideRecord[] = await this.slidesRepository.findAll();
    if (!records.some((record) => record.id === id) || !records.some((record) => record.id === overId)) {
      throw new AppException(ErrorCode.SLIDE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Slide not found');
    }
    const ordered: SlideRecord[] = moveItem({ items: records, id, overId });
    await this.slidesRepository.applySortOrders(planSortOrders(ordered));
  }

  /** Deletes a slide together with its picture files. */
  async remove(id: string): Promise<void> {
    await this.getRecordOrThrow(id);
    await this.slidesRepository.delete(id);
    await this.mediaService.removeAllImages({ entityType: 'slide', entityId: id });
  }

  private async getRecordOrThrow(id: string): Promise<SlideRecord> {
    const record: SlideRecord | undefined = await this.slidesRepository.findById(id);
    if (record === undefined) {
      throw new AppException(ErrorCode.SLIDE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Slide not found');
    }
    return record;
  }

  private async toDetail(record: SlideRecord): Promise<SlideDetailView> {
    const images = await this.mediaService.listImages({ entityType: 'slide', entityId: record.id });
    return { ...record, cover: getCover(images), images };
  }
}
