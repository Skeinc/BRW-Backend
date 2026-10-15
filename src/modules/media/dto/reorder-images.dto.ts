import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

/** Body of PATCH .../images/order. */
export class ReorderImagesDto {
  @ApiProperty({ type: [String], description: 'All image ids in the new order; the first one is the cover' })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  imageIds: string[];
}
