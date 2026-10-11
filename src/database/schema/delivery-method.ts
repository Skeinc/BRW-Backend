import { pgEnum } from 'drizzle-orm/pg-core';

export const deliveryMethod = pgEnum('delivery_method', ['delivery', 'pickup']);
