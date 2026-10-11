import { pgEnum } from 'drizzle-orm/pg-core';

export const orderStatus = pgEnum('order_status', ['new', 'in_progress', 'done', 'cancelled']);
