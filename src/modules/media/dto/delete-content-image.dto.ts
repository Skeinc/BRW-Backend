import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

/** Body of DELETE /api/admin/media/images: only images uploaded through POST /api/admin/media/images. */
export class DeleteContentImageDto {
  @ApiProperty({ example: 'content/3f2b8c4e-0d0a-4f6e-9a55-2a1c7d9e8b10.webp' })
  @IsString()
  @Matches(/^content\/[0-9a-f-]{36}\.webp$/, { message: 'key must be a content image key' })
  key: string;
}
