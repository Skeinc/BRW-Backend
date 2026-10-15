import { sql } from 'drizzle-orm';
import { index, numeric, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { deliveryMethodEnum } from './delivery-method.enum.js';
import { orderStatusEnum } from './order-status.enum.js';
import { paymentMethodEnum } from './payment-method.enum.js';

/** Customer order request submitted from the storefront. */
export const orderRequest = pgTable(
  'order_request',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    number: varchar('number', { length: 20 })
      .notNull()
      .unique()
      .default(sql`'BRW-' || lpad(nextval('order_request_number_seq')::text, 6, '0')`),
    status: orderStatusEnum('status').notNull().default('new'),
    contactName: varchar('contact_name', { length: 120 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    email: varchar('email', { length: 255 }),
    deliveryMethod: deliveryMethodEnum('delivery_method').notNull(),
    city: varchar('city', { length: 120 }),
    address: text('address'),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
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
