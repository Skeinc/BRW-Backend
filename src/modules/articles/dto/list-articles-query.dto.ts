import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

const SEARCH_MAX_LENGTH = 100;

/** Query of GET /api/admin/articles. */
export class ListArticlesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search in the title' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsString()
  @MaxLength(SEARCH_MAX_LENGTH)
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by publication state; omit to list everything' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isPublished?: boolean;
}
