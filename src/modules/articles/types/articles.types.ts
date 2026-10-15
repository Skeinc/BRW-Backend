import type { MediaCover, MediaImageView } from '../../media/types/media.types.js';
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
