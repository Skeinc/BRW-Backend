import type { MediaCover, MediaImageView } from '../types/media.types.js';

/**
 * The cover of an already loaded gallery: its first image, or null when the gallery is empty.
 */
export function getCover(images: MediaImageView[]): MediaCover | null {
  const [first] = images;
  return first === undefined ? null : { url: first.url, thumbUrl: first.thumbUrl };
}
