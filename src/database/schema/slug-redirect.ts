import { pgTable, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { slugEntity } from './slug-entity.js';

export const slugRedirect = pgTable(
  'slug_redirect',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entity: slugEntity('entity').notNull(),
    oldSlug: varchar('old_slug').notNull(),
    targetId: uuid('target_id').notNull(),
  },
  (table) => [uniqueIndex('slug_redirect_entity_old_slug_idx').on(table.entity, table.oldSlug)],
);
