import { pgEnum } from 'drizzle-orm/pg-core';

export const paymentMethodEnum = pgEnum('payment_method', ['cash_on_delivery', 'installment', 'bank_transfer']);
