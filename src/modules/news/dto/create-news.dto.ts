import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { SLUG_PATTERN } from '../../../common/lib/slug-pattern.js';
import { NEWS_SLUG_MAX_LENGTH } from '../constants/news.constants.js';

const TITLE_MAX_LENGTH = 255;
const EXCERPT_MAX_LENGTH = 500;
const CONTENT_MAX_LENGTH = 200_000;
const SEO_TITLE_MAX_LENGTH = 120;
const SEO_DESCRIPTION_MAX_LENGTH = 320;

/** Body of POST /api/admin/news. */
export class CreateNewsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX_LENGTH)
  title: string;

  @ApiPropertyOptional({ description: 'Built from the title (Cyrillic transliterated) when omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(NEWS_SLUG_MAX_LENGTH)
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase latin words and digits separated by dashes' })
  slug?: string;

  @ApiPropertyOptional({ nullable: true, description: 'Short teaser for lists' })
  @IsOptional()
  @IsString()
  @MaxLength(EXCERPT_MAX_LENGTH)
  excerpt?: string | null;

  @ApiProperty({ description: 'Body text (Markdown or HTML). Inline images: upload via POST /admin/media/images' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(CONTENT_MAX_LENGTH)
  content: string;

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

  @ApiPropertyOptional({ default: false, description: 'Hidden from the storefront until published' })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ default: false, description: 'A promotion (sale or discount) rather than plain company news' })
  @IsOptional()
  @IsBoolean()
  isPromo?: boolean;

  @ApiPropertyOptional({
    nullable: true,
    example: '2026-10-16T09:00:00.000Z',
    description: 'Publication date; set automatically on first publish when omitted',
  })
  @IsOptional()
  @IsDateString()
  publishedAt?: string | null;
}
