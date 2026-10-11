import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import sharp, { type OutputInfo } from 'sharp';
import { AppException } from '../../../common/errors/app.exception.js';
import { ErrorCode } from '../../../common/errors/error-code.js';
import { StorageService } from '../../../common/storage/storage.service.js';
import { ProductsRepository } from '../products.repository.js';
import type { AdminProductImage, ProductImageRecord } from '../products.types.js';
import type { ReorderImagesDto } from './dto/reorder-images.dto.js';
import type { UploadImageDto } from './dto/upload-image.dto.js';
import { ProductImagesRepository } from './product-images.repository.js';
import type { UploadedImageFile } from './product-images.types.js';

const MAX_IMAGE_SIDE_PX = 1600;
const WEBP_QUALITY = 82;
// A 10 MB file can decode to far more pixels than it has bytes; refuse decompression bombs.
const MAX_INPUT_PIXELS = 50_000_000;
const SHARP_OPTIONS = { limitInputPixels: MAX_INPUT_PIXELS } as const;
const ACCEPTED_FORMATS: readonly string[] = ['jpeg', 'png', 'webp'];

/**
 * Stores product photos: validates the file, converts it to a webp of up to 1600 px and keeps the gallery order.
 */
@Injectable()
export class ProductImagesService {
  private readonly logger = new Logger(ProductImagesService.name);

  constructor(
    private readonly productImagesRepository: ProductImagesRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Gallery of a product with public URLs.
   */
  async findByProduct(productId: string): Promise<AdminProductImage[]> {
    const rows: ProductImageRecord[] = await this.productImagesRepository.findByProduct(productId);
    return rows.map((row) => this.toAdminImage(row));
  }

  /**
   * Converts the upload to webp, writes it to storage and appends it to the gallery.
   */
  async upload({
    productId,
    file,
    dto,
  }: {
    productId: string;
    file: UploadedImageFile | undefined;
    dto: UploadImageDto;
  }): Promise<AdminProductImage> {
    await this.assertProductExists(productId);
    if (!file) {
      throw this.buildInvalidImage('Send the photo in the "file" field of a multipart request');
    }
    const { data, info } = await this.convertToWebp(file.buffer);
    const key = `products/${productId}/${randomUUID()}.webp`;
    await this.storageService.uploadObject({ key, body: data });
    try {
      const created: ProductImageRecord = await this.productImagesRepository.createLast({
        productId,
        key,
        alt: dto.alt ?? null,
        width: info.width,
        height: info.height,
      });
      return this.toAdminImage(created);
    } catch (err) {
      await this.deleteFiles([key]);
      throw err;
    }
  }

  /**
   * Sets the gallery order. The list must contain exactly the ids of the product's images.
   */
  async reorder({ productId, dto }: { productId: string; dto: ReorderImagesDto }): Promise<AdminProductImage[]> {
    await this.assertProductExists(productId);
    const current: ProductImageRecord[] = await this.productImagesRepository.findByProduct(productId);
    const currentIds = new Set(current.map((image) => image.id));
    const isSameSet: boolean =
      dto.imageIds.length === currentIds.size && dto.imageIds.every((id) => currentIds.has(id));
    if (!isSameSet) {
      throw new AppException(
        ErrorCode.INVALID_IMAGE_ORDER,
        HttpStatus.BAD_REQUEST,
        'imageIds must list every image of the product exactly once',
      );
    }
    await this.productImagesRepository.saveOrder({ productId, imageIds: dto.imageIds });
    return this.findByProduct(productId);
  }

  /**
   * Deletes the row and the file of one image.
   */
  async remove({ productId, imageId }: { productId: string; imageId: string }): Promise<void> {
    await this.assertProductExists(productId);
    const image: ProductImageRecord | undefined = await this.productImagesRepository.findOne({ productId, imageId });
    if (!image) {
      throw new AppException(ErrorCode.PRODUCT_IMAGE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Product image not found');
    }
    await this.productImagesRepository.delete(imageId);
    await this.deleteFiles([image.key]);
  }

  /**
   * Keys of every file that belongs to the product. Read them before deleting the product rows.
   */
  async listKeys(productId: string): Promise<string[]> {
    const rows: ProductImageRecord[] = await this.productImagesRepository.findByProduct(productId);
    return rows.map((row) => row.key);
  }

  /**
   * Best effort: a file that cannot be deleted is logged and skipped, it never fails the request.
   */
  async deleteFiles(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map(async (key) => {
        try {
          await this.storageService.deleteObject(key);
        } catch (err) {
          this.logger.warn(`Could not delete ${key}: ${err instanceof Error ? err.message : 'unknown error'}`);
        }
      }),
    );
  }

  private async convertToWebp(buffer: Buffer): Promise<{ data: Buffer; info: OutputInfo }> {
    try {
      const { format } = await sharp(buffer, SHARP_OPTIONS).metadata();
      if (!format || !ACCEPTED_FORMATS.includes(format)) {
        throw this.buildInvalidImage('Only jpeg, png and webp images are accepted');
      }
      return await sharp(buffer, SHARP_OPTIONS)
        .rotate()
        .resize({ width: MAX_IMAGE_SIDE_PX, height: MAX_IMAGE_SIDE_PX, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer({ resolveWithObject: true });
    } catch (err) {
      if (err instanceof AppException) {
        throw err;
      }
      throw this.buildInvalidImage('The file is not a readable image');
    }
  }

  private async assertProductExists(productId: string): Promise<void> {
    if (!(await this.productsRepository.findById(productId))) {
      throw new AppException(ErrorCode.PRODUCT_NOT_FOUND, HttpStatus.NOT_FOUND, 'Product not found');
    }
  }

  private buildInvalidImage(message: string): AppException {
    return new AppException(ErrorCode.INVALID_IMAGE, HttpStatus.BAD_REQUEST, message);
  }

  private toAdminImage(row: ProductImageRecord): AdminProductImage {
    return {
      id: row.id,
      url: this.storageService.getPublicUrl(row.key),
      key: row.key,
      alt: row.alt,
      sortOrder: row.sortOrder,
      width: row.width,
      height: row.height,
    };
  }
}
