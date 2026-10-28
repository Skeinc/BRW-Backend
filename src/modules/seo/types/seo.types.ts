import type { SEO_ENTITY_TYPES } from '../constants/seo.constants.js';

export type SeoEntityType = (typeof SEO_ENTITY_TYPES)[number];

/** A published page for the sitemap. */
export type SeoUrl = {
  id: string;
  slug: string;
  updatedAt: Date;
};

export type SeoUrls = {
  categories: SeoUrl[];
  collections: SeoUrl[];
  products: SeoUrl[];
  articles: SeoUrl[];
  news: SeoUrl[];
};

/** Current location of an entity whose old slug was requested. */
export type ResolvedSlug = {
  type: SeoEntityType;
  id: string;
  slug: string;
};
