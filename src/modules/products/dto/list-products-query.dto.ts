import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/lib/pagination-query.dto.js';

const MAX_SEARCH_LENGTH = 100;

export class ListProductsQueryDto extends PaginationQueryDto {
  /** Products of this category and of all its subcategories. */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  collectionId?: string;

  /** Part of the product name or article number. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_SEARCH_LENGTH)
  q?: string;
}
