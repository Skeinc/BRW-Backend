import { PartialType } from '@nestjs/swagger';
import { CreateRoomDto } from './create-room.dto.js';

/** Body of PATCH /api/admin/rooms/:id; every field is optional, `null` clears a text. */
export class UpdateRoomDto extends PartialType(CreateRoomDto) {}
