import { pgEnum } from 'drizzle-orm/pg-core';

export const mediaEntityTypeEnum = pgEnum('media_entity_type', [
  'product',
  'category',
  'collection',
  'article',
  'news',
  'slide',
  'room',
  'solution',
]);
