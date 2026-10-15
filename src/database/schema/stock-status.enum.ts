import { pgEnum } from 'drizzle-orm/pg-core';

export const stockStatusEnum = pgEnum('stock_status', ['in_stock', 'on_order', 'out_of_stock']);
