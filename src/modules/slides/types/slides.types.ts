import type { MediaCover, MediaImageView } from '../../media/types/media.types.js';
import type { slide } from '../../../database/schema/slide.js';

export type SlideRecord = typeof slide.$inferSelect;

export type NewSlideValues = typeof slide.$inferInsert;

export type SlidePatch = Partial<Omit<NewSlideValues, 'id' | 'createdAt' | 'updatedAt'>>;

/** Slide as returned by the admin list. */
export type SlideView = SlideRecord & {
  cover: MediaCover | null;
};

/** A slide with its image gallery. */
export type SlideDetailView = SlideView & {
  images: MediaImageView[];
};

/** A published slide for the storefront banner. */
export type PublicSlide = {
  id: string;
  alt: string;
  linkUrl: string | null;
  image: {
    url: string;
    thumbUrl: string;
    width: number;
    height: number;
  };
};
