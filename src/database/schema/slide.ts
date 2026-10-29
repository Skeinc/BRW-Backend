import { boolean, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

/** Slide of the home page banner: a picture (in `media_image`) with an optional link. */
export const slide = pgTable('slide', {
  id: uuid('id').primaryKey().defaultRandom(),
  alt: varchar('alt', { length: 255 }).notNull(),
  linkUrl: varchar('link_url', { length: 500 }),
  sortOrder: integer('sort_order').notNull().default(0),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
