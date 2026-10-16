import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

const SEARCH_MAX_LENGTH = 100;

const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

/** Query of GET /api/admin/collections. */
export class ListCollectionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search in the name' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsString()
  @MaxLength(SEARCH_MAX_LENGTH)
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by publication state; omit to list everything' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'true: only collections with products; false: only empty ones' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  hasProducts?: boolean;
}
