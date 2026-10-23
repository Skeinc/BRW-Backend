import type { AnalyticsPeriod } from '../types/analytics.types.js';

/** Zone used when the client sends none or one the database does not know. */
export const DEFAULT_ANALYTICS_TIME_ZONE = 'UTC';

/** IANA names such as `Europe/Minsk`, `America/Argentina/Buenos_Aires`, `Etc/GMT+3` or `UTC`. */
export const TIME_ZONE_PATTERN = /^[A-Za-z][A-Za-z0-9_+\-/]{0,63}$/;

export const ANALYTICS_PERIODS = ['7d', '30d', '90d', '365d'] as const;

export const DEFAULT_ANALYTICS_PERIOD: AnalyticsPeriod = '30d';

export const ANALYTICS_PERIOD_DAYS: Readonly<Record<AnalyticsPeriod, number>> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '365d': 365,
};

/** Length of the top lists of products. */
export const TOP_PRODUCTS_LIMIT = 10;

/** Length of the short top lists (collections, cities). */
export const TOP_SHORT_LIMIT = 6;
