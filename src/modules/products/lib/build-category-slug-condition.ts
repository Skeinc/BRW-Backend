import { sql, type SQL } from 'drizzle-orm';
import { category } from '../../../database/schema/category.js';
import { product } from '../../../database/schema/product.js';

/** Matches products of the published category with this slug and of every category below it. */
export function buildCategorySlugCondition(slug: string): SQL {
  return sql`${product.categoryId} IN (
    WITH RECURSIVE category_tree AS (
      SELECT ${category.id} AS id FROM ${category} WHERE ${category.slug} = ${slug} AND ${category.isPublished}
      UNION ALL
      SELECT child.id FROM ${category} child JOIN category_tree parent ON child.parent_id = parent.id
    )
    SELECT id FROM category_tree
  )`;
}
