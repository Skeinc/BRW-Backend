import { index, integer, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { product } from './product.js';

export const productImage = pgTable(
  'product_image',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    key: varchar('key').notNull(),
    alt: varchar('alt'),
    sortOrder: integer('sort_order').notNull().default(0),
    width: integer('width'),
    height: integer('height'),
  },
  (table) => [index('product_image_product_id_idx').on(table.productId)],
);
