import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

/** Query of GET /api/admin/orders. */
export class ListOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['new', 'in_progress', 'done', 'cancelled'] })
  @IsOptional()
  @IsIn(['new', 'in_progress', 'done', 'cancelled'])
  status?: 'new' | 'in_progress' | 'done' | 'cancelled';
}
