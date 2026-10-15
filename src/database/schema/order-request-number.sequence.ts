import { pgSequence } from 'drizzle-orm/pg-core';

/** Source of the human-readable order number `BRW-000123`. */
export const orderRequestNumberSequence = pgSequence('order_request_number_seq');
