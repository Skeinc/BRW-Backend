import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  ROOM_MAX_COLLECTIONS,
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

  @ApiPropertyOptional({
    default: false,
    description: 'Kitchens: no solutions and no cart, the room shows `collectionIds` with photos, text and contacts',
  })
  @IsOptional()
  @IsBoolean()
  isConsultationOnly?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'Collections of a consultation-only room in display order; replaces the current list',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(ROOM_MAX_COLLECTIONS)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  collectionIds?: string[];
}
