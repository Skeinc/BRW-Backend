import { pgEnum } from 'drizzle-orm/pg-core';

export const slugRedirectEntityEnum = pgEnum('slug_redirect_entity', ['category', 'collection', 'product', 'article']);
