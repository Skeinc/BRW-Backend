import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { SLIDE_ALT_MAX_LENGTH, SLIDE_LINK_MAX_LENGTH, SLIDE_LINK_PATTERN } from '../constants/slides.constants.js';

/** Body of POST /api/admin/slides. */
export class CreateSlideDto {
  @ApiProperty({ description: 'Text alternative of the picture', example: 'Скидки на спальни' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(SLIDE_ALT_MAX_LENGTH)
  alt: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Path on the site (/catalog) or https address',
    example: '/catalog',
  })
  @IsOptional()
  @IsString()
  @MaxLength(SLIDE_LINK_MAX_LENGTH)
  @Matches(SLIDE_LINK_PATTERN, { message: 'linkUrl must be a path starting with / or an https address' })
  linkUrl?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
