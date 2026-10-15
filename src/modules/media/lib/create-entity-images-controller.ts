import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
  type Type,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ReorderImagesDto } from '../dto/reorder-images.dto.js';
import { UpdateImageDto } from '../dto/update-image.dto.js';
import { UploadImageDto } from '../dto/upload-image.dto.js';
import { MediaService } from '../media.service.js';
import type { MediaEntityType, MediaImageView } from '../types/media.types.js';
import { ApiImageUpload } from './api-image-upload.decorator.js';
import { ImageUploadInterceptor } from './image-upload.interceptor.js';

type CreateEntityImagesControllerInput = {
  entityType: MediaEntityType;
  /** Admin route of the owner, for example `products` gives `/api/admin/products/:id/images`. */
  route: string;
};

/**
 * Builds the gallery controller of one owner type. All owners share one implementation, so
 * `/admin/products/:id/images`, `/admin/categories/:id/images`, `/admin/collections/:id/images` and
 * `/admin/articles/:id/images` behave identically.
 */
export function createEntityImagesController({ entityType, route }: CreateEntityImagesControllerInput): Type<unknown> {
  @ApiTags(`admin-${route}`)
  @ApiCookieAuth()
  @ApiUnauthorizedResponse({ description: 'UNAUTHORIZED: no valid admin cookie' })
  @Controller(`admin/${route}/:id/images`)
  class EntityImagesController {
    constructor(private readonly mediaService: MediaService) {}

    @Get()
    @ApiOperation({ summary: 'List images, cover first' })
    list(@Param('id', ParseUUIDPipe) entityId: string): Promise<MediaImageView[]> {
      return this.mediaService.listImages({ entityType, entityId });
    }

    @Post()
    @UseInterceptors(ImageUploadInterceptor)
    @ApiImageUpload({ alt: { type: 'string' } })
    @ApiOperation({
      summary: 'Upload an image (jpeg/png/webp, up to 10 MB); stored as webp up to 1600 px plus a thumbnail',
    })
    upload(
      @Param('id', ParseUUIDPipe) entityId: string,
      @UploadedFile() file: Express.Multer.File | undefined,
      @Body() dto: UploadImageDto,
    ): Promise<MediaImageView> {
      return this.mediaService.uploadImage({ entityType, entityId, file, alt: dto.alt });
    }

    // Declared before `:imageId` so "order" is not read as an image id.
    @Patch('order')
    @ApiOperation({ summary: 'Reorder images: send every image id in the new order (the first is the cover)' })
    reorder(@Param('id', ParseUUIDPipe) entityId: string, @Body() dto: ReorderImagesDto): Promise<MediaImageView[]> {
      return this.mediaService.reorderImages({ entityType, entityId, imageIds: dto.imageIds });
    }

    @Patch(':imageId')
    @ApiOperation({ summary: 'Change the alt text of an image' })
    updateAlt(
      @Param('id', ParseUUIDPipe) entityId: string,
      @Param('imageId', ParseUUIDPipe) imageId: string,
      @Body() dto: UpdateImageDto,
    ): Promise<MediaImageView> {
      return this.mediaService.updateImageAlt({ entityType, entityId, imageId, alt: dto.alt });
    }

    @Delete(':imageId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete an image (row and files)' })
    remove(
      @Param('id', ParseUUIDPipe) entityId: string,
      @Param('imageId', ParseUUIDPipe) imageId: string,
    ): Promise<void> {
      return this.mediaService.removeImage({ entityType, entityId, imageId });
    }
  }
  return EntityImagesController;
}
