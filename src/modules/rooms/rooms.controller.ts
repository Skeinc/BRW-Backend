import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoomsService } from './rooms.service.js';
import type { PublicRoomCollectionDetail, PublicRoomDetail, PublicRoomItem } from './types/rooms.types.js';

/** Public HTTP endpoints of rooms under `/api/rooms`. */
@ApiTags('catalog')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  /** Published rooms with the number of collections in each. */
  @Get()
  @ApiOperation({ summary: 'Published rooms with collectionCount and imageUrl' })
  list(): Promise<PublicRoomItem[]> {
    return this.roomsService.listPublic();
  }

  /** One published room with its collection cards. */
  @Get(':id')
  @ApiOperation({ summary: 'Published room with the collections that have solutions in it (ROOM_NOT_FOUND)' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<PublicRoomDetail> {
    return this.roomsService.getPublic(id);
  }

  /** A collection inside a room with its ready-made solutions. */
  @Get(':roomId/collections/:collectionId')
  @ApiOperation({ summary: 'Ready-made solutions of a collection in a room (ROOM_NOT_FOUND, COLLECTION_NOT_FOUND)' })
  getCollection(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('collectionId', ParseUUIDPipe) collectionId: string,
  ): Promise<PublicRoomCollectionDetail> {
    return this.roomsService.getCollectionInRoom({ roomId, collectionId });
  }
}
