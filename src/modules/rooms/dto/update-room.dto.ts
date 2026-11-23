import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsOptional, IsUUID } from 'class-validator';
import { ROOM_MAX_COLLECTIONS } from '../constants/rooms.constants.js';
import { CreateRoomDto } from './create-room.dto.js';

/** Body of PATCH /api/admin/rooms/:id; every field is optional, `null` clears a text. */
export class UpdateRoomDto extends PartialType(CreateRoomDto) {
  @ApiPropertyOptional({
    type: [String],
    description:
      'Display order of the collections the room shows. Only orders them: collections are put into rooms from the collection form. Collections not listed keep their order after the listed ones, ids the room does not show are skipped',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(ROOM_MAX_COLLECTIONS)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  collectionIds?: string[];
}
