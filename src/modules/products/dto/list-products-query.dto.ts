import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { PRODUCT_ISSUES } from '../constants/products.constants.js';
import type { ProductIssue } from '../types/products.types.js';

const SEARCH_MAX_LENGTH = 100;

/** Query of GET /api/admin/products. */
export class ListProductsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Includes products of all subcategories' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  collectionId?: string;

  @ApiPropertyOptional({ description: 'Search in name and SKU' })
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

  @ApiPropertyOptional({ enum: PRODUCT_ISSUES, description: 'Only products that need attention' })
  @IsOptional()
  @IsIn(PRODUCT_ISSUES)
  issue?: ProductIssue;
}
