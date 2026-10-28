import { boolean, index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

/** News item (company news or a promotion) with a text body (Markdown or HTML, rendered by the storefront) and pictures. */
export const news = pgTable(
  'news',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 160 }).notNull().unique(),
    title: varchar('title', { length: 255 }).notNull(),
    excerpt: varchar('excerpt', { length: 500 }),
    content: text('content').notNull(),
    seoTitle: varchar('seo_title', { length: 120 }),
    seoDescription: varchar('seo_description', { length: 320 }),
    isPublished: boolean('is_published').notNull().default(false),
    isPromo: boolean('is_promo').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('news_is_published_idx').on(table.isPublished),
    index('news_published_at_idx').on(table.publishedAt),
    index('news_is_promo_idx').on(table.isPromo),
  ],
);
