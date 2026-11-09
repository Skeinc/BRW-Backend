import { index, integer, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { category } from './category.js';
import { product } from './product.js';

/** Category listing of a product: besides its own `product.category_id`, the position it has in that category. */
export const productCategory = pgTable(
  'product_category',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => category.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.categoryId] }),
    index('product_category_category_id_idx').on(table.categoryId),
  ],
);
