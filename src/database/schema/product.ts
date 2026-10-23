import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { category } from './category.js';
import { collection } from './collection.js';
import { stockStatusEnum } from './stock-status.enum.js';

/** Sellable product. Prices are `numeric` (strings in code), dimensions are in millimetres. */
export const product = pgTable(
  'product',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => category.id, { onDelete: 'restrict' }),
    collectionId: uuid('collection_id').references(() => collection.id, { onDelete: 'restrict' }),
    slug: varchar('slug', { length: 160 }).notNull().unique(),
    sku: varchar('sku', { length: 64 }).unique(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    oldPrice: numeric('old_price', { precision: 12, scale: 2 }),
    stockStatus: stockStatusEnum('stock_status').notNull().default('in_stock'),
    widthMm: integer('width_mm'),
    heightMm: integer('height_mm'),
    heightMaxMm: integer('height_max_mm'),
    depthMm: integer('depth_mm'),
    lengthMm: integer('length_mm'),
    material: varchar('material', { length: 100 }),
    colorBody: varchar('color_body', { length: 100 }),
    colorFacade: varchar('color_facade', { length: 100 }),
    assemblyPdfKey: text('assembly_pdf_key'),
    attributes: jsonb('attributes').$type<Record<string, string>>().notNull().default({}),
    isPublished: boolean('is_published').notNull().default(false),
    isHit: boolean('is_hit').notNull().default(false),
    seoTitle: varchar('seo_title', { length: 120 }),
    seoDescription: varchar('seo_description', { length: 320 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('product_category_id_idx').on(table.categoryId),
    index('product_collection_id_idx').on(table.collectionId),
    index('product_price_idx').on(table.price),
    index('product_is_published_idx').on(table.isPublished),
    index('product_name_trgm_idx').using('gin', table.name.op('gin_trgm_ops')),
  ],
);
