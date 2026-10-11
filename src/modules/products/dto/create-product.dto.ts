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
import { MONEY_PATTERN } from '../../../common/lib/money-pattern.js';
import { SLUG_PATTERN } from '../../../common/lib/slug-pattern.js';
import { IsStringRecord } from './string-record.validator.js';

export const STOCK_STATUSES = ['in_stock', 'on_order', 'out_of_stock'] as const;

const MAX_DIMENSION_MM = 100_000;
const MONEY_MESSAGE = 'must be a decimal string with up to 2 digits after the point, for example "1299.00"';

export type StockStatusValue = (typeof STOCK_STATUSES)[number];

export class CreateProductDto {
  /** The deepest category of the product; it also shows in all parent categories. */
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  collectionId?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  /** Latin lower case words joined by hyphens. Generated from the name when omitted. */
  @ApiPropertyOptional({ example: 'krovat-120h200-marselle' })
  @IsOptional()
  @Matches(SLUG_PATTERN, { message: 'slug must be lower case latin words joined by hyphens' })
  @MaxLength(160)
  slug?: string;

  /** Article number, unique. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  sku: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  /** BYN, a decimal string. */
  @ApiProperty({ example: '1299.00' })
  @Matches(MONEY_PATTERN, { message: `price ${MONEY_MESSAGE}` })
  price: string;

  /** Price before the discount, a decimal string. The storefront shows a discount when it is above the price. */
  @ApiPropertyOptional({ example: '1499.00', nullable: true })
  @IsOptional()
  @Matches(MONEY_PATTERN, { message: `oldPrice ${MONEY_MESSAGE}` })
  oldPrice?: string | null;

  @ApiPropertyOptional({ enum: STOCK_STATUSES, default: 'in_stock' })
  @IsOptional()
  @IsIn(STOCK_STATUSES)
  stockStatus?: StockStatusValue;

  @ApiPropertyOptional({ description: 'Millimetres', nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_DIMENSION_MM)
  widthMm?: number | null;

  @ApiPropertyOptional({ description: 'Millimetres; the minimum height when a range is given', nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_DIMENSION_MM)
  heightMm?: number | null;

  @ApiPropertyOptional({ description: 'Millimetres; the maximum height of a range', nullable: true })
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

  @ApiPropertyOptional({ example: 'ЛДСП', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  material?: string | null;

  @ApiPropertyOptional({ example: 'Ясень снежный / дуб сонома темный', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  colorBody?: string | null;

  @ApiPropertyOptional({ example: 'Ясень снежный', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  colorFacade?: string | null;

  /** Key of the assembly instruction PDF inside the uploads directory. */
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  assemblyPdfKey?: string | null;

  /** Other characteristics shown in the details table, name to value. */
  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'string' }, example: { Страна: 'Беларусь' } })
  @IsOptional()
  @IsStringRecord()
  attributes?: Record<string, string>;

  /** Unpublished products are visible only in the admin API. */
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  seoTitle?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  seoDescription?: string | null;
}
