import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.js';
import { toCoverImage } from '../media/lib/to-cover-image.js';
import { MediaService } from '../media/media.service.js';
import type { MediaCoverImage } from '../media/types/media.types.js';
import { RoomsRepository, type CollectionSolutionRow, type SolutionElementRow } from './rooms.repository.js';
import type {
  CollectionRecord,
  PublicCollectionSolution,
  PublicRoomCollection,
  PublicRoomCollectionDetail,
  PublicRoomDetail,
  PublicRoomItem,
  PublicSolution,
  RoomCollectionRef,
  RoomRecord,
  SolutionRecord,
  SolutionRef,
} from './types/rooms.types.js';

/** Storefront reads for rooms, their collections and ready-made solutions. */
@Injectable()
export class RoomsService {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly mediaService: MediaService,
  ) {}

  /** Published rooms with the number of their collections (with solutions, or linked in a consultation-only room). */
  async listPublic(): Promise<PublicRoomItem[]> {
    const [rooms, refs, links] = await Promise.all([
      this.roomsRepository.findPublishedRooms(),
      this.roomsRepository.findPublishedSolutionRefs(),
      this.roomsRepository.findPublishedCollectionLinks(),
    ]);
    const covers = await this.mediaService.getCovers({ entityType: 'room', entityIds: rooms.map(({ id }) => id) });
    return rooms.map((record) => this.toRoomItem({ record, refs, links, covers }));
  }

  /** One published room with its collection cards, in the order of the first solution of each collection; fails with 404 ROOM_NOT_FOUND. */
  async getPublic(id: string): Promise<PublicRoomDetail> {
    const record: RoomRecord = await this.getPublishedRoomOrThrow(id);
    if (record.isConsultationOnly) {
      return this.getConsultationRoom(record);
    }
    const refs: SolutionRef[] = await this.roomsRepository.findPublishedSolutionRefs(id);
    const orderedIds: string[] = [...new Set(refs.map(({ collectionId }) => collectionId))];
    const found: CollectionRecord[] = await this.roomsRepository.findPublishedCollections(orderedIds);
    const foundById = new Map<string, CollectionRecord>(found.map((item) => [item.id, item]));
    const collections: CollectionRecord[] = orderedIds.flatMap((collectionId) => foundById.get(collectionId) ?? []);
    const [roomCovers, solutionCovers] = await Promise.all([
      this.mediaService.getCovers({ entityType: 'room', entityIds: [id] }),
      this.mediaService.getCovers({ entityType: 'solution', entityIds: refs.map((ref) => ref.id) }),
    ]);
    const cards: PublicRoomCollection[] = collections.map((item) => {
      const own: SolutionRef[] = refs.filter(({ collectionId }) => collectionId === item.id);
      const imageUrl: string | null =
        own.map(({ id: solutionId }) => solutionCovers.get(solutionId)?.url).find(Boolean) ?? null;
      return { id: item.id, name: item.name, imageUrl, solutionCount: own.length };
    });
    return this.toRoomDetail({ item: this.toRoomItem({ record, refs, links: [], covers: roomCovers }), record, cards });
  }

  /**
   * A collection inside a room with its photos and published solutions; fails with 404 when the room or the collection
   * is missing, when an ordinary room has no solutions of it, or when a consultation-only room does not show it.
   */
  async getCollectionInRoom({
    roomId,
    collectionId,
  }: {
    roomId: string;
    collectionId: string;
  }): Promise<PublicRoomCollectionDetail> {
    const roomRecord: RoomRecord = await this.getPublishedRoomOrThrow(roomId);
    const collectionRecord: CollectionRecord | undefined = await this.roomsRepository.findCollectionById(collectionId);
    if (collectionRecord === undefined || !collectionRecord.isPublished) {
      throw new AppException(ErrorCode.COLLECTION_NOT_FOUND, HttpStatus.NOT_FOUND, 'Collection not found');
    }
    const solutions: PublicSolution[] = roomRecord.isConsultationOnly
      ? await this.assertLinkedAndReturnNoSolutions({ roomId, collectionId })
      : await this.getSolutionsOrThrow({ roomId, collectionId });
    const images: MediaCoverImage[] = await this.listCoverImages({ entityType: 'collection', entityId: collectionId });
    return {
      room: { id: roomRecord.id, name: roomRecord.name, isConsultationOnly: roomRecord.isConsultationOnly },
      collection: {
        id: collectionRecord.id,
        slug: collectionRecord.slug,
        name: collectionRecord.name,
        description: collectionRecord.description,
        priceFrom: collectionRecord.priceFrom,
        seoTitle: collectionRecord.seoTitle,
        seoDescription: collectionRecord.seoDescription,
        images,
      },
      solutions,
    };
  }

  /** Published solutions of a collection in every room, for the product page; empty when there are none. */
  async listCollectionSolutions(collectionId: string): Promise<PublicCollectionSolution[]> {
    const rows: CollectionSolutionRow[] = await this.roomsRepository.findPublishedSolutionsOfCollection(collectionId);
    const covers: Map<string, MediaCoverImage> = await this.mediaService.getCoverImages({
      entityType: 'solution',
      entityIds: rows.map(({ id }) => id),
    });
    return rows.map((row) => ({ ...row, image: covers.get(row.id) ?? null }));
  }

  private async toSolutions(records: SolutionRecord[]): Promise<PublicSolution[]> {
    const elements: SolutionElementRow[] = await this.roomsRepository.findElements(records.map(({ id }) => id));
    const [galleries, productCovers] = await Promise.all([
      Promise.all(
        records.map((record) => this.mediaService.listImages({ entityType: 'solution', entityId: record.id })),
      ),
      this.mediaService.getCoverImages({
        entityType: 'product',
        entityIds: [...new Set(elements.map(({ id }) => id))],
      }),
    ]);
    return records.map((record, index) => ({
      id: record.id,
      name: record.name,
      description: record.description,
      price: record.price,
      images: galleries[index].map(toCoverImage),
      products: elements
        .filter(({ solutionId }) => solutionId === record.id)
        .map(({ id, name, price, oldPrice }) => ({ id, name, price, oldPrice, image: productCovers.get(id) ?? null })),
    }));
  }

  private async getConsultationRoom(record: RoomRecord): Promise<PublicRoomDetail> {
    const links: RoomCollectionRef[] = await this.roomsRepository.findPublishedCollectionLinks(record.id);
    const collectionIds: string[] = links.map(({ collectionId }) => collectionId);
    const [found, roomCovers, collectionCovers] = await Promise.all([
      this.roomsRepository.findPublishedCollections(collectionIds),
      this.mediaService.getCovers({ entityType: 'room', entityIds: [record.id] }),
      this.mediaService.getCovers({ entityType: 'collection', entityIds: collectionIds }),
    ]);
    const foundById = new Map<string, CollectionRecord>(found.map((item) => [item.id, item]));
    const cards: PublicRoomCollection[] = collectionIds.flatMap((collectionId) => {
      const item: CollectionRecord | undefined = foundById.get(collectionId);
      return item === undefined
        ? []
        : [{ id: item.id, name: item.name, imageUrl: collectionCovers.get(item.id)?.url ?? null, solutionCount: 0 }];
    });
    const item: PublicRoomItem = this.toRoomItem({ record, refs: [], links, covers: roomCovers });
    return this.toRoomDetail({ item, record, cards });
  }

  private toRoomDetail({
    item,
    record,
    cards,
  }: {
    item: PublicRoomItem;
    record: RoomRecord;
    cards: PublicRoomCollection[];
  }): PublicRoomDetail {
    return {
      ...item,
      description: record.description,
      seoTitle: record.seoTitle,
      seoDescription: record.seoDescription,
      collections: cards,
    };
  }

  private async getSolutionsOrThrow({
    roomId,
    collectionId,
  }: {
    roomId: string;
    collectionId: string;
  }): Promise<PublicSolution[]> {
    const records: SolutionRecord[] = await this.roomsRepository.findPublishedSolutions({ roomId, collectionId });
    if (records.length === 0) {
      throw new AppException(ErrorCode.SOLUTION_NOT_FOUND, HttpStatus.NOT_FOUND, 'Solutions not found');
    }
    return this.toSolutions(records);
  }

  private async assertLinkedAndReturnNoSolutions({
    roomId,
    collectionId,
  }: {
    roomId: string;
    collectionId: string;
  }): Promise<PublicSolution[]> {
    const links: RoomCollectionRef[] = await this.roomsRepository.findPublishedCollectionLinks(roomId);
    if (!links.some((link) => link.collectionId === collectionId)) {
      throw new AppException(ErrorCode.COLLECTION_NOT_FOUND, HttpStatus.NOT_FOUND, 'Collection not found');
    }
    return [];
  }

  private async listCoverImages(owner: { entityType: 'collection'; entityId: string }): Promise<MediaCoverImage[]> {
    return (await this.mediaService.listImages(owner)).map(toCoverImage);
  }

  private toRoomItem({
    record,
    refs,
    links,
    covers,
  }: {
    record: RoomRecord;
    refs: SolutionRef[];
    links: RoomCollectionRef[];
    covers: Map<string, { url: string }>;
  }): PublicRoomItem {
    const source: { roomId: string; collectionId: string }[] = record.isConsultationOnly ? links : refs;
    const collectionIds: Set<string> = new Set(
      source.filter(({ roomId }) => roomId === record.id).map(({ collectionId }) => collectionId),
    );
    return {
      id: record.id,
      name: record.name,
      isConsultationOnly: record.isConsultationOnly,
      imageUrl: covers.get(record.id)?.url ?? null,
      collectionCount: collectionIds.size,
    };
  }

  private async getPublishedRoomOrThrow(id: string): Promise<RoomRecord> {
    const record: RoomRecord | undefined = await this.roomsRepository.findRoomById(id);
    if (record === undefined || !record.isPublished) {
      throw new AppException(ErrorCode.ROOM_NOT_FOUND, HttpStatus.NOT_FOUND, 'Room not found');
    }
    return record;
  }
}
