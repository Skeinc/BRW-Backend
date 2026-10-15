import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/** Catalog category. The tree is at most 3 levels deep; the limit is enforced in the service. */
export const category = pgTable(
  'category',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id').references((): AnyPgColumn => category.id, { onDelete: 'restrict' }),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    name: varchar('name', { length: 200 }).notNull(),
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
  },
  (table) => [index('category_parent_id_idx').on(table.parentId)],
);
