import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

const ALT_MAX_LENGTH = 255;

/** Body of PATCH .../images/:imageId. */
export class UpdateImageDto {
  @ApiProperty({ description: 'Alternative text; an empty string clears it' })
  @IsString()
  @MaxLength(ALT_MAX_LENGTH)
  alt: string;
}
