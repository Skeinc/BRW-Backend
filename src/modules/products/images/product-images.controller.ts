import {
  Body,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminController } from '../../admin-auth/decorators/admin-controller.decorator.js';
import type { AdminProductImage } from '../products.types.js';
import { ReorderImagesDto } from './dto/reorder-images.dto.js';
import { UploadImageDto } from './dto/upload-image.dto.js';
import { ProductImagesService } from './product-images.service.js';
import type { UploadedImageFile } from './product-images.types.js';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

@ApiTags('admin-product-images')
@AdminController('products')
export class ProductImagesController {
  constructor(private readonly productImagesService: ProductImagesService) {}

  @Post(':id/images')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  @ApiOperation({ summary: 'Upload one photo (jpeg, png or webp, up to 10 MB). It is stored as webp up to 1600 px' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        alt: { type: 'string', description: 'Alternative text' },
      },
    },
  })
  @ApiCreatedResponse({ description: 'The new image, added at the end of the gallery' })
  @ApiBadRequestResponse({ description: 'INVALID_IMAGE' })
  @ApiNotFoundResponse({ description: 'PRODUCT_NOT_FOUND' })
  upload(
    @Param('id', ParseUUIDPipe) productId: string,
    @UploadedFile() file: UploadedImageFile | undefined,
    @Body() dto: UploadImageDto,
  ): Promise<AdminProductImage> {
    return this.productImagesService.upload({ productId, file, dto });
  }

  @Patch(':id/images/order')
  @ApiOperation({ summary: 'Set the gallery order; the first image is the cover' })
  @ApiOkResponse({ description: 'The gallery in the new order' })
  @ApiBadRequestResponse({ description: 'INVALID_IMAGE_ORDER' })
  @ApiNotFoundResponse({ description: 'PRODUCT_NOT_FOUND' })
  reorder(@Param('id', ParseUUIDPipe) productId: string, @Body() dto: ReorderImagesDto): Promise<AdminProductImage[]> {
    return this.productImagesService.reorder({ productId, dto });
  }

  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a photo and its file' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'PRODUCT_NOT_FOUND or PRODUCT_IMAGE_NOT_FOUND' })
  remove(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ): Promise<void> {
    return this.productImagesService.remove({ productId, imageId });
  }
}
