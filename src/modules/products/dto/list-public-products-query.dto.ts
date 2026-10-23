import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  PUBLIC_DEFAULT_PAGE_SIZE,
  PUBLIC_MAX_PAGE_SIZE,
  PUBLIC_PRODUCT_SORTS,
} from '../constants/products.constants.js';
import type { PublicProductSort } from '../types/products.types.js';
import { PublicProductFiltersDto } from './public-product-filters.dto.js';

/** Query of GET /api/products. */
export class ListPublicProductsQueryDto extends PublicProductFiltersDto {
  @ApiPropertyOptional({ enum: PUBLIC_PRODUCT_SORTS, default: 'popular' })
  @IsOptional()
  @IsIn(PUBLIC_PRODUCT_SORTS)
  sort: PublicProductSort = 'popular';

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: PUBLIC_MAX_PAGE_SIZE, default: PUBLIC_DEFAULT_PAGE_SIZE })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PUBLIC_MAX_PAGE_SIZE)
  pageSize: number = PUBLIC_DEFAULT_PAGE_SIZE;
}
