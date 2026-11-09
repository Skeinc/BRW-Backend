import { jsonb, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import type { DeliveryPageContent } from '../../modules/delivery-page/types/delivery-page.types.js';

/** Editable text content of a storefront page, one row per page key. */
export const pageContent = pgTable('page_content', {
  key: varchar('key', { length: 64 }).primaryKey(),
  content: jsonb('content').$type<DeliveryPageContent>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
