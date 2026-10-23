import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { emptyToUndefined } from '../../../common/transforms/empty-to-undefined.js';
import { toBoolean } from '../../../common/transforms/to-boolean.js';
import { toStringArray } from '../../../common/transforms/to-string-array.js';
import { MAX_FILTER_VALUES, PRICE_PATTERN } from '../constants/products.constants.js';

const SLUG_MAX_LENGTH = 160;
const SEARCH_MAX_LENGTH = 100;
const VALUE_MAX_LENGTH = 100;
const PRICE_MESSAGE = 'must be a decimal string with up to 2 digits after the point, for example "1299.00"';

/** Filters shared by GET /api/products and GET /api/products/facets. Multi-value filters accept `material[]=a&material[]=b`. */
export class PublicProductFiltersDto {
  @ApiPropertyOptional({ description: 'Category slug; includes subcategories' })
  @IsOptional()
  @IsString()
  @MaxLength(SLUG_MAX_LENGTH)
  category?: string;

  @ApiPropertyOptional({ description: 'Collection slug' })
  @IsOptional()
  @IsString()
  @MaxLength(SLUG_MAX_LENGTH)
  collection?: string;

  @ApiPropertyOptional({ description: 'Search in name and SKU, tolerant to typos' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(SEARCH_MAX_LENGTH)
  q?: string;

  @ApiPropertyOptional({ example: '100.00' })
  @IsOptional()
  @Matches(PRICE_PATTERN, { message: `priceMin ${PRICE_MESSAGE}` })
  priceMin?: string;

  @ApiPropertyOptional({ example: '2000.00' })
  @IsOptional()
  @Matches(PRICE_PATTERN, { message: `priceMax ${PRICE_MESSAGE}` })
  priceMax?: string;

  @ApiPropertyOptional({ type: [String], description: 'material[]=…' })
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @ArrayMaxSize(MAX_FILTER_VALUES)
  @IsString({ each: true })
  @MaxLength(VALUE_MAX_LENGTH, { each: true })
  material?: string[];

  @ApiPropertyOptional({ type: [String], description: 'colorBody[]=…' })
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @ArrayMaxSize(MAX_FILTER_VALUES)
  @IsString({ each: true })
  @MaxLength(VALUE_MAX_LENGTH, { each: true })
  colorBody?: string[];

  @ApiPropertyOptional({ type: [String], description: 'colorFacade[]=…' })
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @ArrayMaxSize(MAX_FILTER_VALUES)
  @IsString({ each: true })
  @MaxLength(VALUE_MAX_LENGTH, { each: true })
  colorFacade?: string[];

  @ApiPropertyOptional({ description: 'Only products marked as bestsellers in the admin panel' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  hit?: boolean;

  @ApiPropertyOptional({ description: 'Only products that can be ordered (not out of stock)' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  inStock?: boolean;
}
