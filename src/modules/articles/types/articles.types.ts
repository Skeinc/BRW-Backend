import type { MediaCover, MediaCoverImage, MediaImageView } from '../../media/types/media.types.js';
import type { article } from '../../../database/schema/article.js';

export type ArticleRecord = typeof article.$inferSelect;

export type NewArticleValues = typeof article.$inferInsert;

export type ArticlePatch = Partial<Omit<NewArticleValues, 'id' | 'createdAt' | 'updatedAt'>>;

/** One row of the admin list: no body text. */
export type ArticleListItem = Omit<ArticleRecord, 'content'> & {
  cover: MediaCover | null;
};

/** Full article as returned by the admin API. */
export type ArticleView = ArticleRecord & {
  images: MediaImageView[];
};

export type ArticleListFilters = {
  q?: string;
  isPublished?: boolean;
  page: number;
  pageSize: number;
};

export type ArticleListRowsResult = {
  rows: Omit<ArticleRecord, 'content'>[];
  total: number;
};

/** One card of the storefront article list: no body text. */
export type PublicArticleListItem = Pick<ArticleRecord, 'id' | 'slug' | 'title' | 'excerpt' | 'publishedAt'> & {
  coverImage: MediaCoverImage | null;
};

/** A published article with its body text, photos and SEO texts. */
export type PublicArticleDetail = Pick<
  ArticleRecord,
  'id' | 'slug' | 'title' | 'excerpt' | 'content' | 'seoTitle' | 'seoDescription' | 'publishedAt' | 'updatedAt'
> & {
  images: MediaImageView[];
};

export type PublicArticleFilters = {
  page: number;
  pageSize: number;
};
