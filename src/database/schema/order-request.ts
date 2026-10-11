import { sql } from 'drizzle-orm';
import { index, numeric, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { deliveryMethod } from './delivery-method.js';
import { orderStatus } from './order-status.js';
import { paymentMethod } from './payment-method.js';

export const orderRequest = pgTable(
  'order_request',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    number: varchar('number', { length: 16 })
      .notNull()
      .unique()
      .default(sql`'BRW-' || lpad(nextval('order_request_number_seq')::text, 6, '0')`),
    status: orderStatus('status').notNull().default('new'),
    contactName: varchar('contact_name', { length: 120 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    email: varchar('email', { length: 255 }),
    deliveryMethod: deliveryMethod('delivery_method').notNull(),
    city: varchar('city'),
    address: varchar('address'),
    paymentMethod: paymentMethod('payment_method').notNull(),
    comment: text('comment'),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('order_request_status_idx').on(table.status),
    index('order_request_created_at_idx').on(table.createdAt),
  ],
);
