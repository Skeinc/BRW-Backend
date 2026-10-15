import { index, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { mediaEntityTypeEnum } from './media-entity-type.enum.js';

/**
 * Image gallery of any entity (product, category, collection, article). The image with the lowest
 * `sortOrder` is the cover. There is no foreign key: the owner is addressed by `(entityType, entityId)`
 * and the media module removes its images when the owner is deleted.
 */
export const mediaImage = pgTable(
  'media_image',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: mediaEntityTypeEnum('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    key: text('key').notNull().unique(),
    alt: varchar('alt', { length: 255 }),
    sortOrder: integer('sort_order').notNull().default(0),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('media_image_owner_idx').on(table.entityType, table.entityId, table.sortOrder)],
);
