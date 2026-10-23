import type { SQL } from 'drizzle-orm';
import type { orderRequest } from '../../../database/schema/order-request.js';

type OrderRecord = typeof orderRequest.$inferSelect;

export type AnalyticsOrderStatus = OrderRecord['status'];

export type AnalyticsPaymentMethod = OrderRecord['paymentMethod'];

export type AnalyticsDeliveryMethod = OrderRecord['deliveryMethod'];

export type AnalyticsPeriod = '7d' | '30d' | '90d' | '365d';

/** SQL moments of a period: it starts at `currentFrom`, the previous period of the same length at `previousFrom`. */
export type PeriodBounds = {
  days: number;
  /** Inlined SQL literal of the time zone the days are cut in. */
  timeZone: SQL;
  currentFrom: SQL;
  previousFrom: SQL;
};

/** Totals of one period. `revenue` and `averageCheck` are numeric strings and count only finished orders. */
export type AnalyticsTotals = {
  revenue: string;
  averageCheck: string;
  orders: number;
  cancelledOrders: number;
};

/** One day of the trend; `date` is `YYYY-MM-DD` in the business time zone. */
export type AnalyticsDailyPoint = {
  date: string;
  revenue: string;
  orders: number;
};

export type AnalyticsCount<TKey extends string> = {
  key: TKey;
  count: number;
};

/** Orders created on a weekday (1 is Monday, 7 is Sunday) in an hour of the day (0 to 23). */
export type AnalyticsActivityCell = {
  weekday: number;
  hour: number;
  orders: number;
};

export type AnalyticsProductRow = {
  productId: string;
  name: string;
  revenue: string;
  quantity: number;
};

/** A category with the revenue of its whole subtree; `depth` is 1 for a root category. */
export type AnalyticsCategoryRow = {
  id: string;
  name: string;
  depth: number;
  revenue: string;
};

export type AnalyticsCollectionRow = {
  id: string;
  name: string;
  revenue: string;
};

export type AnalyticsCityRow = {
  city: string;
  orders: number;
};

export type AnalyticsCatalogHealth = {
  outOfStock: number;
  withoutPhoto: number;
  hidden: number;
  withoutCollection: number;
  notOrdered: number;
};

export type AnalyticsReport = {
  period: AnalyticsPeriod;
  /** The zone the report was cut in: the requested one, or the default when it was unknown. */
  timeZone: string;
  /** First and last day of the period, `YYYY-MM-DD`. */
  from: string;
  to: string;
  current: AnalyticsTotals;
  previous: AnalyticsTotals;
  daily: AnalyticsDailyPoint[];
  statuses: AnalyticsCount<AnalyticsOrderStatus>[];
  payments: AnalyticsCount<AnalyticsPaymentMethod>[];
  deliveries: AnalyticsCount<AnalyticsDeliveryMethod>[];
  activity: AnalyticsActivityCell[];
  topProductsByRevenue: AnalyticsProductRow[];
  topProductsByQuantity: AnalyticsProductRow[];
  categories: AnalyticsCategoryRow[];
  collections: AnalyticsCollectionRow[];
  cities: AnalyticsCityRow[];
  catalogHealth: AnalyticsCatalogHealth;
};

/** Raw category row before the subtree order and depth are set. */
export type CategoryRevenueRow = {
  id: string;
  name: string;
  parentId: string | null;
  revenue: string;
};

export type AnalyticsBreakdowns = {
  statuses: AnalyticsCount<AnalyticsOrderStatus>[];
  payments: AnalyticsCount<AnalyticsPaymentMethod>[];
  deliveries: AnalyticsCount<AnalyticsDeliveryMethod>[];
};
