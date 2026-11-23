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

  /** Published rooms with the number of the collections each one shows. */
  async listPublic(): Promise<PublicRoomItem[]> {
    const [rooms, refs, links] = await Promise.all([
      this.roomsRepository.findPublishedRooms(),
      this.roomsRepository.findPublishedSolutionRefs(),
      this.roomsRepository.findPublishedCollectionLinks(),
    ]);
    const covers = await this.mediaService.getCovers({ entityType: 'room', entityIds: rooms.map(({ id }) => id) });
    return rooms.map((record) => this.toRoomItem({ record, refs, links, covers }));
  }

  /**
   * One published room with its collection cards in the order set in the room; an ordinary room shows only the
   * collections with published solutions in it. Fails with 404 ROOM_NOT_FOUND.
   */
  async getPublic(id: string): Promise<PublicRoomDetail> {
    const record: RoomRecord = await this.getPublishedRoomOrThrow(id);
    const [refs, links] = await Promise.all([
      this.roomsRepository.findPublishedSolutionRefs(id),
      this.roomsRepository.findPublishedCollectionLinks(id),
    ]);
    const collectionIds: string[] = this.selectShownCollectionIds({ record, refs, links });
    const [found, roomCovers, collectionCovers, solutionCovers] = await Promise.all([
      this.roomsRepository.findPublishedCollections(collectionIds),
      this.mediaService.getCovers({ entityType: 'room', entityIds: [id] }),
      this.mediaService.getCovers({ entityType: 'collection', entityIds: collectionIds }),
      this.mediaService.getCovers({ entityType: 'solution', entityIds: refs.map((ref) => ref.id) }),
    ]);
    const foundById = new Map<string, CollectionRecord>(found.map((item) => [item.id, item]));
    const cards: PublicRoomCollection[] = collectionIds.flatMap((collectionId) => {
      const item: CollectionRecord | undefined = foundById.get(collectionId);
      return item === undefined ? [] : [this.toCollectionCard({ item, refs, collectionCovers, solutionCovers })];
    });
    const item: PublicRoomItem = this.toRoomItem({ record, refs, links, covers: roomCovers });
    return this.toRoomDetail({ item, record, cards });
  }

  /**
   * A collection inside a room with its photos and published solutions; fails with 404 when the room or the collection
   * is missing, when the room does not show the collection, or when an ordinary room has no solutions of it.
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
    await this.assertCollectionShown({ roomId, collectionId });
    const solutions: PublicSolution[] = roomRecord.isConsultationOnly
      ? []
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

  /** Ids of the collections a room shows, in its order: all linked ones, or in an ordinary room those with solutions. */
  private selectShownCollectionIds({
    record,
    refs,
    links,
  }: {
    record: RoomRecord;
    refs: SolutionRef[];
    links: RoomCollectionRef[];
  }): string[] {
    const linkedIds: string[] = links
      .filter(({ roomId }) => roomId === record.id)
      .map(({ collectionId }) => collectionId);
    if (record.isConsultationOnly) {
      return linkedIds;
    }
    const withSolutions: Set<string> = new Set(
      refs.filter(({ roomId }) => roomId === record.id).map(({ collectionId }) => collectionId),
    );
    return linkedIds.filter((collectionId) => withSolutions.has(collectionId));
  }

  /** A collection card: the photo is the first solution picture of the collection in the room, else its cover. */
  private toCollectionCard({
    item,
    refs,
    collectionCovers,
    solutionCovers,
  }: {
    item: CollectionRecord;
    refs: SolutionRef[];
    collectionCovers: Map<string, { url: string }>;
    solutionCovers: Map<string, { url: string }>;
  }): PublicRoomCollection {
    const own: SolutionRef[] = refs.filter(({ collectionId }) => collectionId === item.id);
    const solutionUrl: string | undefined = own.map(({ id }) => solutionCovers.get(id)?.url).find(Boolean);
    const imageUrl: string | null = solutionUrl ?? collectionCovers.get(item.id)?.url ?? null;
    return { id: item.id, name: item.name, imageUrl, solutionCount: own.length };
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

  private async assertCollectionShown({
    roomId,
    collectionId,
  }: {
    roomId: string;
    collectionId: string;
  }): Promise<void> {
    const links: RoomCollectionRef[] = await this.roomsRepository.findPublishedCollectionLinks(roomId);
    if (!links.some((link) => link.collectionId === collectionId)) {
      throw new AppException(ErrorCode.COLLECTION_NOT_FOUND, HttpStatus.NOT_FOUND, 'Collection not found');
    }
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
    return {
      id: record.id,
      name: record.name,
      isConsultationOnly: record.isConsultationOnly,
      imageUrl: covers.get(record.id)?.url ?? null,
      collectionCount: this.selectShownCollectionIds({ record, refs, links }).length,
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
