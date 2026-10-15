import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { IMAGE_FIELD_NAME, MAX_IMAGE_BYTES } from '../constants/media.constants.js';

/**
 * Reads one image from the multipart field "file" into memory (up to 10 MB).
 * The format is checked by content in `convertToWebp`; client-sent mime types are not trusted.
 */
export const ImageUploadInterceptor = FileInterceptor(IMAGE_FIELD_NAME, {
  storage: memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
});
