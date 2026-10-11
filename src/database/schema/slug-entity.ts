import { pgEnum } from 'drizzle-orm/pg-core';

export const slugEntity = pgEnum('slug_entity', ['category', 'collection', 'product']);
