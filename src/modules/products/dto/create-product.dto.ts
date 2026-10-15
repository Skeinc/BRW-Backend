import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsStringRecord } from '../../../common/decorators/is-string-record.decorator.js';
import { SLUG_PATTERN } from '../../../common/lib/slug-pattern.js';
import { PRICE_PATTERN, PRODUCT_SLUG_MAX_LENGTH } from '../constants/products.constants.js';

const NAME_MAX_LENGTH = 255;
const SKU_MAX_LENGTH = 64;
const SHORT_TEXT_MAX_LENGTH = 100;
const SEO_TITLE_MAX_LENGTH = 120;
const SEO_DESCRIPTION_MAX_LENGTH = 320;
const MAX_DIMENSION_MM = 100_000;
const PRICE_MESSAGE = 'must be a decimal string with up to 2 digits after the point, for example "1299.00"';

/** Body of POST /api/admin/products. Prices are strings, never numbers. */
export class CreateProductDto {
  @ApiProperty({ description: 'Deepest category of the product' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  collectionId?: string | null;

  @ApiProperty({ example: 'Комод Жасмин 4 ящика' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  name: string;

  @ApiPropertyOptional({ description: 'Built from the name (Cyrillic transliterated) when omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(PRODUCT_SLUG_MAX_LENGTH)
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase latin words and digits separated by dashes' })
  slug?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(SKU_MAX_LENGTH)
  sku?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ example: '1299.00', description: 'Numeric string' })
  @Matches(PRICE_PATTERN, { message: `price ${PRICE_MESSAGE}` })
  price: string;

  @ApiPropertyOptional({ example: '1499.00', nullable: true, description: 'Numeric string' })
  @IsOptional()
  @Matches(PRICE_PATTERN, { message: `oldPrice ${PRICE_MESSAGE}` })
  oldPrice?: string | null;

  @ApiPropertyOptional({ enum: ['in_stock', 'on_order', 'out_of_stock'], default: 'in_stock' })
  @IsOptional()
  @IsIn(['in_stock', 'on_order', 'out_of_stock'])
  stockStatus?: 'in_stock' | 'on_order' | 'out_of_stock';

  @ApiPropertyOptional({ description: 'Millimetres', nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_DIMENSION_MM)
  widthMm?: number | null;

  @ApiPropertyOptional({ description: 'Millimetres', nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_DIMENSION_MM)
  heightMm?: number | null;

  @ApiPropertyOptional({ description: 'Millimetres', nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_DIMENSION_MM)
  heightMaxMm?: number | null;

  @ApiPropertyOptional({ description: 'Millimetres', nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_DIMENSION_MM)
  depthMm?: number | null;

  @ApiPropertyOptional({ description: 'Millimetres', nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_DIMENSION_MM)
  lengthMm?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(SHORT_TEXT_MAX_LENGTH)
  material?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(SHORT_TEXT_MAX_LENGTH)
  colorBody?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(SHORT_TEXT_MAX_LENGTH)
  colorFacade?: string | null;

  @ApiPropertyOptional({
    example: { 'Количество ящиков': '4' },
    description: 'Free-form characteristics: text to text',
  })
  @IsOptional()
  @IsStringRecord()
  attributes?: Record<string, string>;

  @ApiPropertyOptional({ default: false, description: 'Products are hidden from the storefront until published' })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(SEO_TITLE_MAX_LENGTH)
  seoTitle?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(SEO_DESCRIPTION_MAX_LENGTH)
  seoDescription?: string | null;
}
