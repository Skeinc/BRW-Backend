import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsUUID } from 'class-validator';

export class ReorderImagesDto {
  /** Every image id of the product in the wanted order. The first one becomes the cover. */
  @ApiProperty({ type: [String], format: 'uuid' })
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  imageIds: string[];
}
