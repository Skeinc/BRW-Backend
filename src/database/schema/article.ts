import { boolean, index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

/** article with a text body (Markdown or HTML, rendered by the storefront) and one picture. */
export const article = pgTable(
  'article',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 160 }).notNull().unique(),
    title: varchar('title', { length: 255 }).notNull(),
    excerpt: varchar('excerpt', { length: 500 }),
    content: text('content').notNull(),
    seoTitle: varchar('seo_title', { length: 120 }),
    seoDescription: varchar('seo_description', { length: 320 }),
    isPublished: boolean('is_published').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('article_is_published_idx').on(table.isPublished),
    index('article_published_at_idx').on(table.publishedAt),
  ],
);
