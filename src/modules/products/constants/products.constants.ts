export const PRODUCT_SLUG_MAX_LENGTH = 160;
/** Generated SKUs look like `BRW-000123`; the number is the highest existing one plus one. */
export const GENERATED_SKU_PREFIX = 'BRW-';
export const GENERATED_SKU_DIGITS = 6;
export const PRICE_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

export const PRODUCT_ISSUES = ['out_of_stock', 'no_photo', 'no_collection', 'not_ordered'] as const;

/** A product without a non-cancelled order line for this many days counts as not ordered. */
export const NOT_ORDERED_DAYS = 90;

export const PUBLIC_PRODUCT_SORTS = ['price_asc', 'price_desc', 'new', 'popular'] as const;
export const PUBLIC_DEFAULT_PAGE_SIZE = 12;
export const PUBLIC_MAX_PAGE_SIZE = 48;
/** Most values accepted for one multi-value filter such as `material[]`. */
export const MAX_FILTER_VALUES = 20;
/** The popularity of a product is the number of order lines of non-cancelled orders in this many days. */
export const POPULAR_DAYS = 90;
