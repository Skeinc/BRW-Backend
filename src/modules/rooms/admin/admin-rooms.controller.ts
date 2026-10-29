import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { MoveItemDto } from '../../../common/dto/move-item.dto.js';
import type { PaginatedResult } from '../../../common/lib/pagination.types.js';
import { CreateRoomDto } from '../dto/create-room.dto.js';
import { ListRoomsQueryDto } from '../dto/list-rooms-query.dto.js';
import { UpdateRoomDto } from '../dto/update-room.dto.js';
import type { RoomDetailView, RoomView } from '../types/admin-rooms.types.js';
import { AdminRoomsService } from './admin-rooms.service.js';

/** HTTP endpoints of rooms under `/api/admin/rooms` (admin cookie required). */
@ApiTags('admin-rooms')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED: no valid admin cookie' })
@Controller('admin/rooms')
export class AdminRoomsController {
  constructor(private readonly roomsService: AdminRoomsService) {}

  /** One page of rooms in display order. */
  @Get()
  @ApiOperation({ summary: 'One page of rooms in display order, with the cover and solution count' })
  list(@Query() query: ListRoomsQueryDto): Promise<PaginatedResult<RoomView>> {
    return this.roomsService.list(query);
  }

  /** Get one room with its gallery. */
  @Get(':id')
  @ApiOperation({ summary: 'Get one room (ROOM_NOT_FOUND)' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<RoomDetailView> {
    return this.roomsService.get(id);
  }

  /** Create a room at the end of the list. */
  @Post()
  @ApiOperation({ summary: 'Create a room at the end of the list' })
  create(@Body() dto: CreateRoomDto): Promise<RoomDetailView> {
    return this.roomsService.create(dto);
  }

  /** Update a room. */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a room; null clears a text field' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoomDto): Promise<RoomDetailView> {
    return this.roomsService.update(id, dto);
  }

  /** Move a room to the position of another one. */
  @Patch(':id/move')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Put a room where another one is now' })
  move(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MoveItemDto): Promise<void> {
    return this.roomsService.move({ id, overId: dto.overId });
  }

  /** Delete an empty room with its photos. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a room (ROOM_NOT_EMPTY while it has solutions)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.roomsService.remove(id);
  }
}
