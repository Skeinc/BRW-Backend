import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { SLUG_PATTERN } from '../../../common/lib/slug-pattern.js';

export class CreateCollectionDto {
  /** Name as written in the catalog, for example `MARSELLE` or `ИНДИАНА`. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  /** Latin lower case words joined by hyphens. Generated from the name when omitted. */
  @ApiPropertyOptional({ example: 'san-gimignano' })
  @IsOptional()
  @Matches(SLUG_PATTERN, { message: 'slug must be lower case latin words joined by hyphens' })
  @MaxLength(120)
  slug?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

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

  /** Key of the cover file inside the uploads directory. */
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageKey?: string | null;

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
