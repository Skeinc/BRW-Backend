import { index, integer, numeric, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { orderRequest } from './order-request.js';
import { product } from './product.js';

export const orderRequestItem = pgTable(
  'order_request_item',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderRequestId: uuid('order_request_id')
      .notNull()
      .references(() => orderRequest.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 64 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    qty: integer('qty').notNull(),
  },
  (table) => [index('order_request_item_order_request_id_idx').on(table.orderRequestId)],
);
