import type { category } from '../../database/schema/category.js';

export type CategoryRecord = typeof category.$inferSelect;

export type NewCategory = typeof category.$inferInsert;

export type CategoryNode = Pick<CategoryRecord, 'id' | 'parentId'>;

export type AdminCategory = CategoryRecord & {
  level: number;
  productCount: number;
};
