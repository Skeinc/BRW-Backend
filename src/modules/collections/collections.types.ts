import type { collection } from '../../database/schema/collection.js';

export type CollectionRecord = typeof collection.$inferSelect;

export type NewCollection = typeof collection.$inferInsert;

export type AdminCollection = CollectionRecord & {
  productCount: number;
};
