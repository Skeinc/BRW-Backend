import { gte, lte, type SQL } from 'drizzle-orm';
import { product } from '../../../database/schema/product.js';
import { MM_IN_CM } from '../constants/products.constants.js';
import type { DimensionName, PublicProductFilters } from '../types/products.types.js';

/** Product column of each size, in millimetres. */
export const DIMENSION_COLUMNS = {
  width: product.widthMm,
  height: product.heightMm,
  depth: product.depthMm,
  length: product.lengthMm,
} as const;

/** Range conditions of the size filters (centimetres in the filters, millimetres in the table), except the omitted size. */
export function buildDimensionConditions({
  filters,
  omit,
}: {
  filters: PublicProductFilters;
  omit?: DimensionName;
}): (SQL | undefined)[] {
  return (Object.keys(DIMENSION_COLUMNS) as DimensionName[])
    .filter((name) => name !== omit)
    .flatMap((name) => {
      const from: number | undefined = filters[`${name}Min`];
      const to: number | undefined = filters[`${name}Max`];
      return [
        from === undefined ? undefined : gte(DIMENSION_COLUMNS[name], from * MM_IN_CM),
        to === undefined ? undefined : lte(DIMENSION_COLUMNS[name], to * MM_IN_CM),
      ];
    });
}
