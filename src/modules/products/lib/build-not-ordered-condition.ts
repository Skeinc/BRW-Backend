import { sql, type SQL } from 'drizzle-orm';
import { NOT_ORDERED_DAYS } from '../constants/products.constants.js';

/**
 * Condition that is true for a product with no order line of a non-cancelled order in the last
 * `NOT_ORDERED_DAYS` days; `productId` is the SQL of the product id column.
 */
export function buildNotOrderedCondition(productId: SQL): SQL {
  return sql`NOT EXISTS (
    SELECT 1 FROM order_request_item i
    JOIN order_request o ON o.id = i.order_request_id
    WHERE i.product_id = ${productId} AND o.status <> 'cancelled'
      AND o.created_at >= now() - make_interval(days => ${NOT_ORDERED_DAYS}::int)
  )`;
}
