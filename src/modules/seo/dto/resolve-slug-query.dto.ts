import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SEO_ENTITY_TYPES, SLUG_QUERY_MAX_LENGTH } from '../constants/seo.constants.js';
import type { SeoEntityType } from '../types/seo.types.js';

/** Query of GET /api/seo/resolve. */
export class ResolveSlugQueryDto {
  @ApiProperty({ enum: SEO_ENTITY_TYPES })
  @IsIn(SEO_ENTITY_TYPES)
  type: SeoEntityType;

  @ApiProperty({ description: 'The old slug from the requested URL' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(SLUG_QUERY_MAX_LENGTH)
  slug: string;
}
