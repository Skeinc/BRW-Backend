import { asc, desc, sql, type SQL } from 'drizzle-orm';
import { product } from '../../../database/schema/product.js';
import { category } from '../../../database/schema/category.js';
import { productCategory } from '../../../database/schema/product-category.js';
import { POPULAR_DAYS } from '../constants/products.constants.js';
import type { PublicProductSort } from '../types/products.types.js';

/** Order lines of non-cancelled orders of the product in the last `POPULAR_DAYS` days. */
const popularity: SQL = sql`(
  SELECT count(*) FROM order_request_item i
  JOIN order_request o ON o.id = i.order_request_id
  WHERE i.product_id = ${product.id} AND o.status <> 'cancelled'
    AND o.created_at >= now() - make_interval(days => ${POPULAR_DAYS}::int)
)`;

/** Position of the product in the listing of the category with this slug; products without one go last. */
function buildListingPosition(categorySlug: string): SQL {
  return sql`(
    SELECT ${productCategory.position} FROM ${productCategory}
    JOIN ${category} ON ${category.id} = ${productCategory.categoryId}
    WHERE ${productCategory.productId} = ${product.id} AND ${category.slug} = ${categorySlug}
  ) ASC NULLS LAST`;
}

/**
 * Order of a collection page: the original shop shows a collection as its products inside the category listings,
 * so products go category by category, each in the position it has in its own category.
 */
function buildCollectionOrder(): SQL[] {
  return [
    asc(category.sortOrder),
    sql`(
      SELECT ${productCategory.position} FROM ${productCategory}
      WHERE ${productCategory.productId} = ${product.id} AND ${productCategory.categoryId} = ${product.categoryId}
    ) ASC NULLS LAST`,
  ];
}

function buildShopOrder({ categorySlug, hasCollection }: { categorySlug?: string; hasCollection: boolean }): SQL[] {
  if (categorySlug !== undefined) {
    return [buildListingPosition(categorySlug)];
  }
  return hasCollection ? buildCollectionOrder() : [];
}

/**
 * ORDER BY of the storefront list; every order ends with the id so pages never overlap.
 * The default order inside a category or a collection follows the listing order of the original shop.
 */
export function buildPublicProductOrder({
  sort,
  categorySlug,
  hasCollection = false,
}: {
  sort: PublicProductSort;
  categorySlug?: string;
  hasCollection?: boolean;
}): SQL[] {
  const orders: Record<PublicProductSort, SQL[]> = {
    price_asc: [asc(product.price), desc(product.createdAt)],
    price_desc: [desc(product.price), desc(product.createdAt)],
    new: [desc(product.createdAt)],
    popular: [...buildShopOrder({ categorySlug, hasCollection }), desc(popularity), desc(product.createdAt)],
  };
  return [...orders[sort], asc(product.id)];
}
