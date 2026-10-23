import type { mediaImage } from '../../../database/schema/media-image.js';

export type MediaImageRecord = typeof mediaImage.$inferSelect;

/** Kinds of entities that own an image gallery. */
export type MediaEntityType = MediaImageRecord['entityType'];

/** The owner of a gallery. */
export type MediaOwner = {
  entityType: MediaEntityType;
  entityId: string;
};

/** A gallery image as returned by the API. `thumbUrl` is a 480 px version for lists. */
export type MediaImageView = {
  id: string;
  url: string;
  thumbUrl: string;
  alt: string | null;
  sortOrder: number;
  width: number;
  height: number;
};

/** Cover (first) image of an entity, for lists. */
export type MediaCover = {
  url: string;
  thumbUrl: string;
};

/** Cover of an entity with the size and alt text the storefront needs to render it without layout shift. */
export type MediaCoverImage = MediaCover & {
  alt: string | null;
  width: number;
  height: number;
};

/** A converted image: the main webp (max 1600 px) and its small thumbnail. */
export type ProcessedImage = {
  main: Buffer;
  thumbnail: Buffer;
  width: number;
  height: number;
};

/** Image written to storage (not tied to an owner, for example text content). */
export type StoredImage = {
  key: string;
  url: string;
  width: number;
  height: number;
};

export type UploadImageInput = MediaOwner & {
  file: Express.Multer.File | undefined;
  alt?: string;
};

export type ReorderImagesInput = MediaOwner & {
  imageIds: string[];
};

export type ImageRef = MediaOwner & {
  imageId: string;
};

export type NewMediaImageValues = MediaOwner & {
  key: string;
  alt: string | null;
  width: number;
  height: number;
};
