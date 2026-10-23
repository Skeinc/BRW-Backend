import { sql, type SQL } from 'drizzle-orm';

/** Condition that is true for a product without any photo; `productId` is the SQL of the product id column. */
export function buildNoPhotoCondition(productId: SQL): SQL {
  return sql`NOT EXISTS (
    SELECT 1 FROM media_image m WHERE m.entity_type = 'product' AND m.entity_id = ${productId}
  )`;
}
