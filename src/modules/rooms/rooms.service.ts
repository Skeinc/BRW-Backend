import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.js';
import { MediaService } from '../media/media.service.js';
import type { MediaCoverImage } from '../media/types/media.types.js';
import { RoomsRepository, type SolutionElementRow } from './rooms.repository.js';
import type {
  CollectionRecord,
  PublicRoomCollection,
  PublicRoomCollectionDetail,
  PublicRoomDetail,
  PublicRoomItem,
  PublicSolution,
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

  /** Published rooms with the number of collections that have published solutions in them. */
  async listPublic(): Promise<PublicRoomItem[]> {
    const [rooms, refs] = await Promise.all([
      this.roomsRepository.findPublishedRooms(),
      this.roomsRepository.findPublishedSolutionRefs(),
    ]);
    const covers = await this.mediaService.getCovers({ entityType: 'room', entityIds: rooms.map(({ id }) => id) });
    return rooms.map((record) => this.toRoomItem({ record, refs, covers }));
  }

  /** One published room with its collection cards; fails with 404 ROOM_NOT_FOUND. */
  async getPublic(id: string): Promise<PublicRoomDetail> {
    const record: RoomRecord = await this.getPublishedRoomOrThrow(id);
    const refs: SolutionRef[] = await this.roomsRepository.findPublishedSolutionRefs(id);
    const collections: CollectionRecord[] = await this.roomsRepository.findPublishedCollections([
      ...new Set(refs.map(({ collectionId }) => collectionId)),
    ]);
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
    return {
      ...this.toRoomItem({ record, refs, covers: roomCovers }),
      description: record.description,
      seoTitle: record.seoTitle,
      seoDescription: record.seoDescription,
      collections: cards,
    };
  }

  /** A collection inside a room with its published solutions; fails with 404 when the room, the collection or the solutions are missing. */
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
    const records: SolutionRecord[] = await this.roomsRepository.findPublishedSolutions({ roomId, collectionId });
    if (records.length === 0) {
      throw new AppException(ErrorCode.SOLUTION_NOT_FOUND, HttpStatus.NOT_FOUND, 'Solutions not found');
    }
    const solutions: PublicSolution[] = await this.toSolutions(records);
    return {
      room: { id: roomRecord.id, name: roomRecord.name },
      collection: {
        id: collectionRecord.id,
        name: collectionRecord.name,
        description: collectionRecord.description,
        seoTitle: collectionRecord.seoTitle,
        seoDescription: collectionRecord.seoDescription,
      },
      solutions,
    };
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
      images: galleries[index].map((image): MediaCoverImage => ({
        url: image.url,
        thumbUrl: image.thumbUrl,
        alt: image.alt,
        width: image.width,
        height: image.height,
      })),
      products: elements
        .filter(({ solutionId }) => solutionId === record.id)
        .map(({ id, name, price, oldPrice }) => ({ id, name, price, oldPrice, image: productCovers.get(id) ?? null })),
    }));
  }

  private toRoomItem({
    record,
    refs,
    covers,
  }: {
    record: RoomRecord;
    refs: SolutionRef[];
    covers: Map<string, { url: string }>;
  }): PublicRoomItem {
    const collectionIds: Set<string> = new Set(
      refs.filter(({ roomId }) => roomId === record.id).map(({ collectionId }) => collectionId),
    );
    return {
      id: record.id,
      name: record.name,
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
