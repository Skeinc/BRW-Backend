import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.js';
import { StorageService } from '../../common/storage/storage.service.js';
import { CONTENT_IMAGE_FOLDER, ENTITY_FOLDERS, OWNER_NOT_FOUND_CODES } from './constants/media.constants.js';
import { convertToWebp } from './lib/convert-to-webp.js';
import { getThumbnailKey } from './lib/get-thumbnail-key.js';
import { MediaRepository } from './media.repository.js';
import type {
  ImageRef,
  MediaCover,
  MediaEntityType,
  MediaImageRecord,
  MediaImageView,
  MediaOwner,
  ProcessedImage,
  ReorderImagesInput,
  StoredImage,
  UploadImageInput,
} from './types/media.types.js';

/**
 * The only place that converts, stores, lists and removes images. Entities (products, categories, collections,
 * articles) own a gallery addressed by `(entityType, entityId)`; the cover is the image with the lowest sort order.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly storageService: StorageService,
  ) {}

  /** Gallery of one owner as API views, cover first. */
  async listImages(owner: MediaOwner): Promise<MediaImageView[]> {
    const records: MediaImageRecord[] = await this.mediaRepository.findByOwner(owner);
    return records.map((record) => this.toView(record));
  }

  /** Cover per owner id for a whole list in one query; owners without images are absent from the map. */
  async getCovers({
    entityType,
    entityIds,
  }: {
    entityType: MediaEntityType;
    entityIds: string[];
  }): Promise<Map<string, MediaCover>> {
    const records: MediaImageRecord[] = await this.mediaRepository.findCovers({ entityType, entityIds });
    return new Map(records.map((record) => [record.entityId, this.toCover(record)]));
  }

  /** Converts the upload to webp (main + thumbnail), stores both files and appends the image to the gallery. */
  async uploadImage({ entityType, entityId, file, alt }: UploadImageInput): Promise<MediaImageView> {
    await this.assertOwnerExists({ entityType, entityId });
    const stored: ProcessedImage & StoredImage = await this.storeProcessedImage({
      folder: `${ENTITY_FOLDERS[entityType]}/${entityId}`,
      file,
    });
    try {
      const record: MediaImageRecord = await this.mediaRepository.insertLast({
        entityType,
        entityId,
        key: stored.key,
        alt: alt ?? null,
        width: stored.width,
        height: stored.height,
      });
      return this.toView(record);
    } catch (err) {
      await this.deleteFilesQuietly([stored.key]);
      throw err;
    }
  }

  /** Sets the order of a gallery; the ids must be exactly the owner's images. */
  async reorderImages({ entityType, entityId, imageIds }: ReorderImagesInput): Promise<MediaImageView[]> {
    await this.assertOwnerExists({ entityType, entityId });
    const records: MediaImageRecord[] = await this.mediaRepository.findByOwner({ entityType, entityId });
    const knownIds = new Set(records.map((record) => record.id));
    const isSameSet: boolean = imageIds.length === knownIds.size && imageIds.every((id) => knownIds.has(id));
    if (!isSameSet) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST,
        'imageIds must list every image exactly once',
      );
    }
    await this.mediaRepository.saveOrder({ entityType, entityId, imageIds });
    return this.listImages({ entityType, entityId });
  }

  /** Changes the alt text of an image; an empty string clears it. */
  async updateImageAlt({ alt, ...ref }: ImageRef & { alt: string }): Promise<MediaImageView> {
    await this.getImageOrThrow(ref);
    const record: MediaImageRecord = await this.mediaRepository.updateAlt({
      id: ref.imageId,
      alt: alt === '' ? null : alt,
    });
    return this.toView(record);
  }

  /** Deletes the row and both files of one image. */
  async removeImage(ref: ImageRef): Promise<void> {
    const record: MediaImageRecord = await this.getImageOrThrow(ref);
    await this.mediaRepository.delete(record.id);
    await this.deleteFilesQuietly([record.key]);
  }

  /** Deletes the whole gallery of an owner that is being deleted (rows in one query, files best-effort). */
  async removeAllImages(owner: MediaOwner): Promise<void> {
    const keys: string[] = await this.mediaRepository.deleteByOwner(owner);
    await this.deleteFilesQuietly(keys);
  }

  /** Stores an image that belongs to no owner, for example a picture inside article text. */
  async uploadContentImage(file: Express.Multer.File | undefined): Promise<StoredImage> {
    const { key, url, width, height } = await this.storeProcessedImage({ folder: CONTENT_IMAGE_FOLDER, file });
    return { key, url, width, height };
  }

  /** Deletes an image stored with `uploadContentImage`. */
  async deleteContentImage(key: string): Promise<void> {
    await this.deleteFilesQuietly([key]);
  }

  private async storeProcessedImage({
    folder,
    file,
  }: {
    folder: string;
    file: Express.Multer.File | undefined;
  }): Promise<ProcessedImage & StoredImage> {
    if (file === undefined) {
      throw new AppException(ErrorCode.IMAGE_INVALID, HttpStatus.BAD_REQUEST, 'Attach the image in the "file" field');
    }
    const processed: ProcessedImage = await convertToWebp(file.buffer);
    const key = `${folder}/${randomUUID()}.webp`;
    const writes = await Promise.allSettled([
      this.storageService.uploadObject({ key, body: processed.main }),
      this.storageService.uploadObject({ key: getThumbnailKey(key), body: processed.thumbnail }),
    ]);
    const failed = writes.find((write): write is PromiseRejectedResult => write.status === 'rejected');
    if (failed !== undefined) {
      await this.deleteFilesQuietly([key]);
      throw failed.reason;
    }
    return { ...processed, key, url: this.storageService.getPublicUrl(key) };
  }

  /** Best-effort removal of main and thumbnail files: failures are logged and never thrown. */
  private async deleteFilesQuietly(keys: string[]): Promise<void> {
    const allKeys: string[] = keys.flatMap((key) => [key, getThumbnailKey(key)]);
    await Promise.all(
      allKeys.map(async (key) => {
        try {
          await this.storageService.deleteObject(key);
        } catch (err) {
          this.logger.warn(`Could not delete file ${key}: ${err instanceof Error ? err.message : 'unknown error'}`);
        }
      }),
    );
  }

  private async assertOwnerExists(owner: MediaOwner): Promise<void> {
    if (!(await this.mediaRepository.hasOwner(owner))) {
      throw new AppException(
        OWNER_NOT_FOUND_CODES[owner.entityType],
        HttpStatus.NOT_FOUND,
        `${owner.entityType.charAt(0).toUpperCase()}${owner.entityType.slice(1)} not found`,
      );
    }
  }

  private async getImageOrThrow({ entityType, entityId, imageId }: ImageRef): Promise<MediaImageRecord> {
    await this.assertOwnerExists({ entityType, entityId });
    const record: MediaImageRecord | undefined = await this.mediaRepository.findById(imageId);
    if (record === undefined || record.entityType !== entityType || record.entityId !== entityId) {
      throw new AppException(ErrorCode.IMAGE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Image not found');
    }
    return record;
  }

  private toView(record: MediaImageRecord): MediaImageView {
    return {
      id: record.id,
      ...this.toCover(record),
      alt: record.alt,
      sortOrder: record.sortOrder,
      width: record.width,
      height: record.height,
    };
  }

  private toCover(record: MediaImageRecord): MediaCover {
    return {
      url: this.storageService.getPublicUrl(record.key),
      thumbUrl: this.storageService.getPublicUrl(getThumbnailKey(record.key)),
    };
  }
}
