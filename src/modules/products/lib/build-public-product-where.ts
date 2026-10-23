import { and, eq, gte, ilike, inArray, lte, ne, or, sql, type SQL } from 'drizzle-orm';
import { buildContainsPattern } from '../../../common/lib/build-contains-pattern.js';
import { buildVisibleCategoryIds } from '../../categories/lib/build-visible-category-ids.js';
import { collection } from '../../../database/schema/collection.js';
import { product } from '../../../database/schema/product.js';
import type { PublicProductFilterKey, PublicProductFilters } from '../types/products.types.js';
import { buildCategorySlugCondition } from './build-category-slug-condition.js';

type BuildPublicProductWhereInput = {
  filters: PublicProductFilters;
  /** A facet leaves out its own filter so the other values of that filter stay selectable. */
  omit?: PublicProductFilterKey;
};

/** WHERE of the storefront: published products of visible categories matching every filter except the omitted one. */
export function buildPublicProductWhere({ filters, omit }: BuildPublicProductWhereInput): SQL | undefined {
  const {
    category,
    collection: collectionSlug,
    q,
    priceMin,
    priceMax,
    material,
    colorBody,
    colorFacade,
    inStock,
  } = filters;
  const use = (key: PublicProductFilterKey): boolean => omit !== key;
  return and(
    eq(product.isPublished, true),
    sql`${product.categoryId} IN ${buildVisibleCategoryIds()}`,
    category !== undefined && use('category') ? buildCategorySlugCondition(category) : undefined,
    collectionSlug !== undefined && use('collection')
      ? sql`${product.collectionId} IN (SELECT ${collection.id} FROM ${collection} WHERE ${collection.slug} = ${collectionSlug} AND ${collection.isPublished})`
      : undefined,
    q === undefined ? undefined : buildSearchCondition(q),
    priceMin !== undefined && use('price') ? gte(product.price, priceMin) : undefined,
    priceMax !== undefined && use('price') ? lte(product.price, priceMax) : undefined,
    material !== undefined && use('material') ? inArray(product.material, material) : undefined,
    colorBody !== undefined && use('colorBody') ? inArray(product.colorBody, colorBody) : undefined,
    colorFacade !== undefined && use('colorFacade') ? inArray(product.colorFacade, colorFacade) : undefined,
    inStock === true ? ne(product.stockStatus, 'out_of_stock') : undefined,
  );
}

/** Substring match on name or SKU, or a similar word in the name (trigram index), so typos still find products. */
function buildSearchCondition(q: string): SQL | undefined {
  const pattern: string = buildContainsPattern(q);
  return or(ilike(product.name, pattern), ilike(product.sku, pattern), sql`${q} <% ${product.name}`);
}
