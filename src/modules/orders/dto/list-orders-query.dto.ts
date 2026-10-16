import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

const SEARCH_MAX_LENGTH = 100;

/** Query of GET /api/admin/orders. */
export class ListOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['new', 'in_progress', 'done', 'cancelled'] })
  @IsOptional()
  @IsIn(['new', 'in_progress', 'done', 'cancelled'])
  status?: 'new' | 'in_progress' | 'done' | 'cancelled';

  @ApiPropertyOptional({ description: 'Search in the order number, the contact name and the phone' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsString()
  @MaxLength(SEARCH_MAX_LENGTH)
  q?: string;
}
