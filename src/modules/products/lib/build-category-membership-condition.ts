import { sql, type SQL } from 'drizzle-orm';
import { productCategory } from '../../../database/schema/product-category.js';
import { product } from '../../../database/schema/product.js';

/** Matches products that belong to one of the categories: by their own category or by an extra listing. */
export function buildCategoryMembershipCondition(categoryIds: SQL): SQL {
  return sql`(${product.categoryId} IN (${categoryIds}) OR ${product.id} IN (
    SELECT ${productCategory.productId} FROM ${productCategory} WHERE ${productCategory.categoryId} IN (${categoryIds})
  ))`;
}
