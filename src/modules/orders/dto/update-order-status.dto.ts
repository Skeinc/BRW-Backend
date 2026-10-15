import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

/** Body of PATCH /api/admin/orders/:id. */
export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ['new', 'in_progress', 'done', 'cancelled'] })
  @IsIn(['new', 'in_progress', 'done', 'cancelled'])
  status: 'new' | 'in_progress' | 'done' | 'cancelled';
}
