export const PRODUCT_SLUG_MAX_LENGTH = 160;
export const PRICE_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

export const PRODUCT_ISSUES = ['out_of_stock', 'no_photo', 'no_collection', 'not_ordered'] as const;

/** A product without a non-cancelled order line for this many days counts as not ordered. */
export const NOT_ORDERED_DAYS = 90;
