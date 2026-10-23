import { sql, type SQL } from 'drizzle-orm';
import { category } from '../../../database/schema/category.js';

/** Subquery of the ids of published categories whose whole chain of parents is published too. */
export function buildVisibleCategoryIds(): SQL {
  return sql`(
    WITH RECURSIVE visible_category AS (
      SELECT ${category.id} AS id FROM ${category} WHERE ${category.parentId} IS NULL AND ${category.isPublished}
      UNION ALL
      SELECT child.id FROM ${category} child
      JOIN visible_category parent ON child.parent_id = parent.id
      WHERE child.is_published
    )
    SELECT id FROM visible_category
  )`;
}
