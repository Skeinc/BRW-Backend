import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { SLUG_PATTERN } from '../../../common/lib/slug-pattern.js';
import { COLLECTION_MAX_ROOMS } from '../../rooms/constants/rooms.constants.js';
import { COLLECTION_SLUG_MAX_LENGTH } from '../constants/collections.constants.js';

const NAME_MAX_LENGTH = 120;
const SEO_TITLE_MAX_LENGTH = 120;
const SEO_DESCRIPTION_MAX_LENGTH = 320;
const MONEY_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

/** Body of POST /api/admin/collections. */
export class CreateCollectionDto {
  @ApiProperty({ example: 'JASMIN' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  name: string;

  @ApiPropertyOptional({ description: 'Built from the name (Cyrillic transliterated) when omitted', example: 'jasmin' })
  @IsOptional()
  @IsString()
  @MaxLength(COLLECTION_SLUG_MAX_LENGTH)
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase latin words and digits separated by dashes' })
  slug?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: '1500.00',
    description: 'Starting price "от …" on the collection page of a consultation-only room, up to 2 decimals',
  })
  @IsOptional()
  @IsString()
  @Matches(MONEY_PATTERN, { message: 'priceFrom must be a price with up to 2 decimals' })
  priceFrom?: string | null;

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

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Rooms that show the collection; replaces the current list. A new room gets the collection at its end. A room that still has solutions of the collection cannot be left out (COLLECTION_HAS_SOLUTIONS_IN_ROOM)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(COLLECTION_MAX_ROOMS)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  roomIds?: string[];
}
