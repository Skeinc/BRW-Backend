import type { MediaCover, MediaCoverImage, MediaImageView } from '../../media/types/media.types.js';
import type { news } from '../../../database/schema/news.js';

export type NewsRecord = typeof news.$inferSelect;

export type NewNewsValues = typeof news.$inferInsert;

export type NewsPatch = Partial<Omit<NewNewsValues, 'id' | 'createdAt' | 'updatedAt'>>;

/** One row of the admin list: no body text. */
export type NewsListItem = Omit<NewsRecord, 'content'> & {
  cover: MediaCover | null;
};

/** Full news item as returned by the admin API. */
export type NewsView = NewsRecord & {
  images: MediaImageView[];
};

export type NewsListFilters = {
  q?: string;
  isPublished?: boolean;
  isPromo?: boolean;
  page: number;
  pageSize: number;
};

export type NewsListRowsResult = {
  rows: Omit<NewsRecord, 'content'>[];
  total: number;
};

/** One card of the storefront news list: no body text. */
export type PublicNewsListItem = Pick<NewsRecord, 'id' | 'slug' | 'title' | 'excerpt' | 'isPromo' | 'publishedAt'> & {
  coverImage: MediaCoverImage | null;
};

/** A published news item with its body text, photos and SEO texts. */
export type PublicNewsDetail = Pick<
  NewsRecord,
  | 'id'
  | 'slug'
  | 'title'
  | 'excerpt'
  | 'content'
  | 'isPromo'
  | 'seoTitle'
  | 'seoDescription'
  | 'publishedAt'
  | 'updatedAt'
> & {
  images: MediaImageView[];
};

export type PublicNewsFilters = {
  isPromo?: boolean;
  page: number;
  pageSize: number;
};
