import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../../common/errors/app.exception.js';
import { ErrorCode } from '../../../common/errors/error-code.js';
import type { LinkedCollection, LinkedRoom, RoomCollectionLink } from '../types/admin-rooms.types.js';
import type { RoomRecord } from '../types/rooms.types.js';
import { AdminRoomCollectionsRepository } from './admin-room-collections.repository.js';

/**
 * Business rules of the link between rooms and collections. A collection is put into rooms from its own form and
 * ordered inside a room from the room form. A link that still has solutions cannot be removed, and a solution can
 * only be made for a collection shown in an ordinary room.
 */
@Injectable()
export class AdminRoomCollectionsService {
  constructor(private readonly linksRepository: AdminRoomCollectionsRepository) {}

  /** Rooms of every collection, by collection id, in room order. */
  async listRoomsByCollection(): Promise<Map<string, LinkedRoom[]>> {
    const links: RoomCollectionLink[] = await this.linksRepository.findLinks();
    return links.reduce((byCollection, { collectionId, ...linked }) => {
      byCollection.set(collectionId, [...(byCollection.get(collectionId) ?? []), linked]);
      return byCollection;
    }, new Map<string, LinkedRoom[]>());
  }

  /** Rooms of one collection, in room order. */
  async listRoomsOf(collectionId: string): Promise<LinkedRoom[]> {
    const links: RoomCollectionLink[] = await this.linksRepository.findLinks({ collectionId });
    return links.map(({ collectionId: _collectionId, ...linked }) => linked);
  }

  /** Collections of every room, by room id, in display order. */
  async listCollectionsByRoom(): Promise<Map<string, LinkedCollection[]>> {
    const links: RoomCollectionLink[] = await this.linksRepository.findLinks();
    return links.reduce((byRoom, { roomId, ...linked }) => {
      byRoom.set(roomId, [...(byRoom.get(roomId) ?? []), linked]);
      return byRoom;
    }, new Map<string, LinkedCollection[]>());
  }

  /** Collections of one room, in display order. */
  async listCollectionsOf(roomId: string): Promise<LinkedCollection[]> {
    const links: RoomCollectionLink[] = await this.linksRepository.findLinks({ roomId });
    return links.map(({ roomId: _roomId, ...linked }) => linked);
  }

  /**
   * Checks that a collection can be shown in exactly `roomIds`: every room exists (404 ROOM_NOT_FOUND) and no room it
   * leaves still has its solutions (409 COLLECTION_HAS_SOLUTIONS_IN_ROOM). Pass no `collectionId` for a new collection.
   */
  async assertRoomsReplaceable({ collectionId, roomIds }: { collectionId?: string; roomIds: string[] }): Promise<void> {
    if ((await this.linksRepository.countExistingRooms(roomIds)) !== roomIds.length) {
      throw new AppException(ErrorCode.ROOM_NOT_FOUND, HttpStatus.NOT_FOUND, 'Room not found');
    }
    if (collectionId === undefined) {
      return;
    }
    const current: LinkedRoom[] = await this.listRoomsOf(collectionId);
    const blockedRoomIds: string[] = current
      .filter((linked) => linked.solutionCount > 0 && !roomIds.includes(linked.roomId))
      .map((linked) => linked.roomId);
    if (blockedRoomIds.length > 0) {
      throw new AppException(
        ErrorCode.COLLECTION_HAS_SOLUTIONS_IN_ROOM,
        HttpStatus.CONFLICT,
        'Collection still has solutions in a room it leaves',
        { roomIds: blockedRoomIds },
      );
    }
  }

  /** Shows a collection in exactly `roomIds`: kept rooms keep its place, new rooms get it at the end. */
  async replaceRoomsOf({ collectionId, roomIds }: { collectionId: string; roomIds: string[] }): Promise<void> {
    const currentRoomIds: string[] = (await this.listRoomsOf(collectionId)).map((linked) => linked.roomId);
    await this.linksRepository.replaceRoomsOfCollection({
      collectionId,
      removedRoomIds: currentRoomIds.filter((roomId) => !roomIds.includes(roomId)),
      addedRoomIds: roomIds.filter((roomId) => !currentRoomIds.includes(roomId)),
    });
  }

  /**
   * Orders the collections of a room by `collectionIds`. Collections not listed keep their order after the listed
   * ones, and ids the room does not show are skipped, so a collection linked meanwhile from its form is not lost.
   */
  async reorderCollectionsOf({ roomId, collectionIds }: { roomId: string; collectionIds: string[] }): Promise<void> {
    const currentIds: string[] = (await this.listCollectionsOf(roomId)).map((linked) => linked.collectionId);
    const listed: string[] = collectionIds.filter((collectionId) => currentIds.includes(collectionId));
    const rest: string[] = currentIds.filter((collectionId) => !listed.includes(collectionId));
    await this.linksRepository.applyCollectionOrder({ roomId, collectionIds: [...listed, ...rest] });
  }

  /**
   * Checks that a solution of the collection can live in the room: the room exists (404 ROOM_NOT_FOUND), sells
   * solutions (409 ROOM_CONSULTATION_ONLY) and shows the collection (409 COLLECTION_NOT_IN_ROOM).
   */
  async assertSolutionAllowed({ roomId, collectionId }: { roomId: string; collectionId: string }): Promise<void> {
    const record: RoomRecord | undefined = await this.linksRepository.findRoomById(roomId);
    if (record === undefined) {
      throw new AppException(ErrorCode.ROOM_NOT_FOUND, HttpStatus.NOT_FOUND, 'Room not found');
    }
    if (record.isConsultationOnly) {
      throw new AppException(ErrorCode.ROOM_CONSULTATION_ONLY, HttpStatus.CONFLICT, 'Room is consultation only');
    }
    const links: RoomCollectionLink[] = await this.linksRepository.findLinks({ roomId, collectionId });
    if (links.length === 0) {
      throw new AppException(ErrorCode.COLLECTION_NOT_IN_ROOM, HttpStatus.CONFLICT, 'Collection is not in the room');
    }
  }
}
