import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

const ALT_MAX_LENGTH = 255;

/** Text fields that accompany the uploaded file. */
export class UploadImageDto {
  @ApiPropertyOptional({ description: 'Alternative text of the image' })
  @IsOptional()
  @IsString()
  @MaxLength(ALT_MAX_LENGTH)
  alt?: string;
}
