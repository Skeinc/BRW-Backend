import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';
import { SLUG_PATTERN } from '../../../common/lib/slug-pattern.js';
import { CATEGORY_SLUG_MAX_LENGTH } from '../constants/categories.constants.js';

const NAME_MAX_LENGTH = 200;
const SEO_TITLE_MAX_LENGTH = 120;
const SEO_DESCRIPTION_MAX_LENGTH = 320;

/** Body of POST /api/admin/categories. */
export class CreateCategoryDto {
  @ApiProperty({ example: 'Комоды' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  name: string;

  @ApiPropertyOptional({ description: 'Built from the name (Cyrillic transliterated) when omitted', example: 'komody' })
  @IsOptional()
  @IsString()
  @MaxLength(CATEGORY_SLUG_MAX_LENGTH)
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase latin words and digits separated by dashes' })
  slug?: string;

  @ApiPropertyOptional({ description: 'Parent category id; omit or null for a root category', nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

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
}
