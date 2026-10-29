import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  ROOM_NAME_MAX_LENGTH,
  ROOM_SEO_DESCRIPTION_MAX_LENGTH,
  ROOM_SEO_TITLE_MAX_LENGTH,
} from '../constants/rooms.constants.js';

/** Body of POST /api/admin/rooms. */
export class CreateRoomDto {
  @ApiProperty({ example: 'Гостиные' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(ROOM_NAME_MAX_LENGTH)
  name: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(ROOM_SEO_TITLE_MAX_LENGTH)
  seoTitle?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(ROOM_SEO_DESCRIPTION_MAX_LENGTH)
  seoDescription?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
