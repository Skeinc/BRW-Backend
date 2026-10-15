import { THUMBNAIL_SUFFIX } from '../constants/media.constants.js';

/**
 * Storage key of the thumbnail that is written next to a main image: `<uuid>.webp` -> `<uuid>-thumb.webp`.
 */
export function getThumbnailKey(key: string): string {
  return key.replace(/\.webp$/, THUMBNAIL_SUFFIX);
}
