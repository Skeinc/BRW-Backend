import { pgSequence } from 'drizzle-orm/pg-core';

export const orderNumberSequence = pgSequence('order_request_number_seq', { startWith: 1 });
