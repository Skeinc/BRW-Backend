import { ErrorCode } from '../../../common/errors/error-code.js';
import type { MediaEntityType } from '../types/media.types.js';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_INPUT_PIXELS = 100_000_000;
export const MAIN_IMAGE_SIDE_PX = 1600;
export const THUMBNAIL_SIDE_PX = 480;
export const MAIN_WEBP_QUALITY = 82;
export const THUMBNAIL_WEBP_QUALITY = 75;
export const ALLOWED_IMAGE_FORMATS: readonly string[] = ['jpeg', 'png', 'webp'];
export const IMAGE_FIELD_NAME = 'file';
export const CONTENT_IMAGE_FOLDER = 'content';
export const THUMBNAIL_SUFFIX = '-thumb.webp';

/** Storage folder of each owner type: `<folder>/<entityId>/<uuid>.webp`. */
export const ENTITY_FOLDERS: Readonly<Record<MediaEntityType, string>> = {
  product: 'products',
  category: 'categories',
  collection: 'collections',
  article: 'articles',
  news: 'news',
  slide: 'slides',
  room: 'rooms',
  solution: 'solutions',
};

/** Error returned when the owner of a gallery does not exist. */
export const OWNER_NOT_FOUND_CODES: Readonly<Record<MediaEntityType, ErrorCode>> = {
  product: ErrorCode.PRODUCT_NOT_FOUND,
  category: ErrorCode.CATEGORY_NOT_FOUND,
  collection: ErrorCode.COLLECTION_NOT_FOUND,
  article: ErrorCode.ARTICLE_NOT_FOUND,
  news: ErrorCode.NEWS_NOT_FOUND,
  slide: ErrorCode.SLIDE_NOT_FOUND,
  room: ErrorCode.ROOM_NOT_FOUND,
  solution: ErrorCode.SOLUTION_NOT_FOUND,
};
