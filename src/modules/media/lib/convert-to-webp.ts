import { HttpStatus } from '@nestjs/common';
import sharp, { type ResizeOptions, type Sharp } from 'sharp';
import { AppException } from '../../../common/errors/app.exception.js';
import { ErrorCode } from '../../../common/errors/error-code.js';
import {
  ALLOWED_IMAGE_FORMATS,
  MAIN_IMAGE_SIDE_PX,
  MAIN_WEBP_QUALITY,
  MAX_INPUT_PIXELS,
  THUMBNAIL_SIDE_PX,
  THUMBNAIL_WEBP_QUALITY,
} from '../constants/media.constants.js';
import type { ProcessedImage } from '../types/media.types.js';

function buildInvalidImageException(message: string): AppException {
  return new AppException(ErrorCode.IMAGE_INVALID, HttpStatus.BAD_REQUEST, message);
}

function fitInside(side: number): ResizeOptions {
  return { width: side, height: side, fit: 'inside', withoutEnlargement: true };
}

/**
 * Validates an uploaded image by its content and converts it to a main webp (max 1600 px) and a thumbnail
 * (max 480 px). The input is decoded once per size and both sizes are encoded in parallel.
 * Fails with 400 IMAGE_INVALID when the bytes are not a jpeg, png or webp image.
 */
export async function convertToWebp(source: Buffer): Promise<ProcessedImage> {
  try {
    const { format } = await sharp(source, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    if (format === undefined || !ALLOWED_IMAGE_FORMATS.includes(format)) {
      throw buildInvalidImageException('Only jpeg, png and webp images are accepted');
    }
    const oriented: Sharp = sharp(source, { limitInputPixels: MAX_INPUT_PIXELS, sequentialRead: true }).rotate();
    const [main, thumbnail] = await Promise.all([
      oriented
        .clone()
        .resize(fitInside(MAIN_IMAGE_SIDE_PX))
        .webp({ quality: MAIN_WEBP_QUALITY })
        .toBuffer({ resolveWithObject: true }),
      oriented.clone().resize(fitInside(THUMBNAIL_SIDE_PX)).webp({ quality: THUMBNAIL_WEBP_QUALITY }).toBuffer(),
    ]);
    return { main: main.data, thumbnail, width: main.info.width, height: main.info.height };
  } catch (err) {
    if (err instanceof AppException) {
      throw err;
    }
    throw buildInvalidImageException('The file is not a readable image');
  }
}
