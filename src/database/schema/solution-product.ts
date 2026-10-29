import { integer, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { product } from './product.js';
import { solution } from './solution.js';

/** Product that is part of a ready-made solution; `sortOrder` is its place in the list of elements. */
export const solutionProduct = pgTable(
  'solution_product',
  {
    solutionId: uuid('solution_id')
      .notNull()
      .references(() => solution.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'restrict' }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.solutionId, table.productId] })],
);
