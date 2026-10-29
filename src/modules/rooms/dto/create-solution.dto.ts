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
  Matches,
  MaxLength,
} from 'class-validator';
import { SOLUTION_MAX_PRODUCTS, SOLUTION_NAME_MAX_LENGTH } from '../constants/rooms.constants.js';

/** Body of POST /api/admin/solutions. */
export class CreateSolutionDto {
  @ApiProperty()
  @IsUUID()
  roomId: string;

  @ApiProperty()
  @IsUUID()
  collectionId: string;

  @ApiProperty({ example: 'Гостиная №1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(SOLUTION_NAME_MAX_LENGTH)
  name: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ example: '738.96', description: 'Price of the whole set, up to 2 decimals' })
  @IsString()
  @Matches(/^\d{1,10}(\.\d{1,2})?$/)
  price: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Element products in display order' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(SOLUTION_MAX_PRODUCTS)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  productIds?: string[];
}
