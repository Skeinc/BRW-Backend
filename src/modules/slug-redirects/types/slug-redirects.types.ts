export type SlugRedirectEntity = 'category' | 'collection' | 'product' | 'article' | 'news';

export type RecordSlugChangeInput = {
  entity: SlugRedirectEntity;
  oldSlug: string;
  targetId: string;
};

export type ReleaseSlugInput = {
  entity: SlugRedirectEntity;
  slug: string;
};

export type RemoveSlugRedirectsInput = {
  entity: SlugRedirectEntity;
  targetId: string;
};
