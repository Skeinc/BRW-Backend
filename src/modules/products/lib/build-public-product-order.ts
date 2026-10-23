import { asc, desc, sql, type SQL } from 'drizzle-orm';
import { product } from '../../../database/schema/product.js';
import { POPULAR_DAYS } from '../constants/products.constants.js';
import type { PublicProductSort } from '../types/products.types.js';

/** Order lines of non-cancelled orders of the product in the last `POPULAR_DAYS` days. */
const popularity: SQL = sql`(
  SELECT count(*) FROM order_request_item i
  JOIN order_request o ON o.id = i.order_request_id
  WHERE i.product_id = ${product.id} AND o.status <> 'cancelled'
    AND o.created_at >= now() - make_interval(days => ${POPULAR_DAYS}::int)
)`;

/** ORDER BY of the storefront list; every order ends with the id so pages never overlap. */
export function buildPublicProductOrder(sort: PublicProductSort): SQL[] {
  const orders: Record<PublicProductSort, SQL[]> = {
    price_asc: [asc(product.price), desc(product.createdAt)],
    price_desc: [desc(product.price), desc(product.createdAt)],
    new: [desc(product.createdAt)],
    popular: [desc(popularity), desc(product.createdAt)],
  };
  return [...orders[sort], asc(product.id)];
}
