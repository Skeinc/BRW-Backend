import { Body, Controller, Delete, HttpCode, HttpStatus, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { DeleteContentImageDto } from './dto/delete-content-image.dto.js';
import { ApiImageUpload } from './lib/api-image-upload.decorator.js';
import { ImageUploadInterceptor } from './lib/image-upload.interceptor.js';
import { MediaService } from './media.service.js';
import type { StoredImage } from './types/media.types.js';

/** HTTP endpoints of media under `/api/admin/media/images` (admin cookie required). */
@ApiTags('admin-media')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED: no valid admin cookie' })
@Controller('admin/media/images')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /** Upload an image for text content (article body); returns its URL to paste into the text. */
  @Post()
  @UseInterceptors(ImageUploadInterceptor)
  @ApiImageUpload()
  @ApiOperation({
    summary: 'Upload an image for text content (article body); returns its URL to paste into the text',
  })
  upload(@UploadedFile() file: Express.Multer.File | undefined): Promise<StoredImage> {
    return this.mediaService.uploadContentImage(file);
  }

  /** Delete an image uploaded through POST /admin/media/images. */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an image uploaded through POST /admin/media/images' })
  remove(@Body() dto: DeleteContentImageDto): Promise<void> {
    return this.mediaService.deleteContentImage(dto.key);
  }
}
