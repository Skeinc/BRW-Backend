import { boolean, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

/** Furniture collection (series), for example JASMIN or CLASSIC. */
export const collection = pgTable('collection', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  description: text('description'),
  seoTitle: varchar('seo_title', { length: 120 }),
  seoDescription: varchar('seo_description', { length: 320 }),
  sortOrder: integer('sort_order').notNull().default(0),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
