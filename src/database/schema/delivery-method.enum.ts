import { pgEnum } from 'drizzle-orm/pg-core';

export const deliveryMethodEnum = pgEnum('delivery_method', ['delivery', 'pickup']);
