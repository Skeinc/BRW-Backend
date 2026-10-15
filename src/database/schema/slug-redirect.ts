import { pgTable, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { slugRedirectEntityEnum } from './slug-redirect-entity.enum.js';

/** Old slug of a renamed category, collection or product, so old links keep working. */
export const slugRedirect = pgTable(
  'slug_redirect',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entity: slugRedirectEntityEnum('entity').notNull(),
    oldSlug: varchar('old_slug', { length: 160 }).notNull(),
    targetId: uuid('target_id').notNull(),
  },
  (table) => [unique('slug_redirect_entity_old_slug_unique').on(table.entity, table.oldSlug)],
);
