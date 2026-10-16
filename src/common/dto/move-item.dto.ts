import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Body of PATCH .../:id/move: put the item where `overId` is now; the rest of the list shifts. */
export class MoveItemDto {
  @ApiProperty({ description: 'Id of the item whose position the moved item takes' })
  @IsUUID()
  overId: string;
}
