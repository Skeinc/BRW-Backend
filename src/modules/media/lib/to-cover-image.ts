import type { MediaCoverImage, MediaImageView } from '../types/media.types.js';

/** A gallery image as the storefront shows it: urls, alt and size, without the admin id and order. */
export function toCoverImage(image: MediaImageView): MediaCoverImage {
  return { url: image.url, thumbUrl: image.thumbUrl, alt: image.alt, width: image.width, height: image.height };
}
