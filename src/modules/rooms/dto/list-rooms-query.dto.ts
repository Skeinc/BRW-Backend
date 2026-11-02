import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { emptyToUndefined } from '../../../common/transforms/empty-to-undefined.js';
import { toBoolean } from '../../../common/transforms/to-boolean.js';

const SEARCH_MAX_LENGTH = 100;

/** Query of GET /api/admin/rooms. */
export class ListRoomsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search in the name' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(SEARCH_MAX_LENGTH)
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by publication state; omit to list everything' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isPublished?: boolean;
}
