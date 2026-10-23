import { Inject, Injectable } from '@nestjs/common';
import { and, desc, gte, lt, sql, type SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';
import { orderRequest } from '../../database/schema/order-request.js';
import { buildNoPhotoCondition } from '../products/lib/build-no-photo-condition.js';
import { buildNotOrderedCondition } from '../products/lib/build-not-ordered-condition.js';
import { TOP_PRODUCTS_LIMIT, TOP_SHORT_LIMIT } from './constants/analytics.constants.js';
import type {
  AnalyticsActivityCell,
  AnalyticsBreakdowns,
  AnalyticsCount,
  AnalyticsDeliveryMethod,
  AnalyticsOrderStatus,
  AnalyticsPaymentMethod,
  AnalyticsCatalogHealth,
  AnalyticsCityRow,
  AnalyticsCollectionRow,
  AnalyticsDailyPoint,
  AnalyticsProductRow,
  AnalyticsTotals,
  CategoryRevenueRow,
  PeriodBounds,
} from './types/analytics.types.js';

/** One row of the combined breakdown query. */
type BreakdownRow = { kind: 'status' | 'payment' | 'delivery'; key: string; count: number };

/** Which total orders the top list of products is sorted by. */
type ProductSort = 'revenue' | 'quantity';

/** Lines of finished orders of the period: the base of every revenue query. */
function buildSoldLines(currentFrom: SQL): SQL {
  return sql`(
    SELECT i.product_id, i.name, i.qty, i.unit_price * i.qty AS amount
    FROM order_request_item i
    JOIN order_request o ON o.id = i.order_request_id
    WHERE o.status = 'done' AND o.created_at >= ${currentFrom}
  )`;
}

/** Read-only aggregate queries over orders and the catalog. Money stays a numeric string. */
@Injectable()
export class AnalyticsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /** Totals of the current period (`previous` false) or of the period before it. */
  async findTotals({ bounds, previous }: { bounds: PeriodBounds; previous: boolean }): Promise<AnalyticsTotals> {
    const [row] = await this.db
      .select({
        revenue: sql<string>`coalesce(sum(${orderRequest.total}) FILTER (WHERE ${orderRequest.status} = 'done'), 0)`,
        averageCheck: sql<string>`coalesce(round(avg(${orderRequest.total}) FILTER (WHERE ${orderRequest.status} = 'done'), 2), 0)`,
        orders: sql<number>`count(*)::int`,
        cancelledOrders: sql<number>`(count(*) FILTER (WHERE ${orderRequest.status} = 'cancelled'))::int`,
      })
      .from(orderRequest)
      .where(this.buildWindow({ bounds, previous }));
    return row;
  }

  /** One point for each day of the period, days without orders included. */
  async findDaily(bounds: PeriodBounds): Promise<AnalyticsDailyPoint[]> {
    const zone: SQL = bounds.timeZone;
    const rows = await this.db.execute<AnalyticsDailyPoint>(sql`
      SELECT
        to_char(day, 'YYYY-MM-DD') AS date,
        coalesce(sum(o.total) FILTER (WHERE o.status = 'done'), 0)::text AS revenue,
        count(o.id)::int AS orders
      FROM generate_series(
        (now() AT TIME ZONE ${zone})::date - ${bounds.days - 1}::int,
        (now() AT TIME ZONE ${zone})::date,
        interval '1 day'
      ) AS day
      LEFT JOIN order_request o
        ON (o.created_at AT TIME ZONE ${zone})::date = day::date AND o.created_at >= ${bounds.currentFrom}
      GROUP BY day
      ORDER BY day
    `);
    return [...rows];
  }

  /** Orders of the period counted by status, payment method and delivery method, in one round trip. */
  async findBreakdowns(bounds: PeriodBounds): Promise<AnalyticsBreakdowns> {
    const rows = await this.db.execute<BreakdownRow>(sql`
      SELECT 'status' AS kind, status::text AS key, count(*)::int AS count
      FROM order_request WHERE created_at >= ${bounds.currentFrom} GROUP BY status
      UNION ALL
      SELECT 'payment', payment_method::text, count(*)::int
      FROM order_request WHERE created_at >= ${bounds.currentFrom} GROUP BY payment_method
      UNION ALL
      SELECT 'delivery', delivery_method::text, count(*)::int
      FROM order_request WHERE created_at >= ${bounds.currentFrom} GROUP BY delivery_method
    `);
    return {
      statuses: this.pickCounts<AnalyticsOrderStatus>({ rows, kind: 'status' }),
      payments: this.pickCounts<AnalyticsPaymentMethod>({ rows, kind: 'payment' }),
      deliveries: this.pickCounts<AnalyticsDeliveryMethod>({ rows, kind: 'delivery' }),
    };
  }

  /** Orders of the period counted by weekday and hour of the day. */
  async findActivity(bounds: PeriodBounds): Promise<AnalyticsActivityCell[]> {
    const local = sql`${orderRequest.createdAt} AT TIME ZONE ${bounds.timeZone}`;
    const weekday = sql<number>`extract(isodow FROM ${local})::int`;
    const hour = sql<number>`extract(hour FROM ${local})::int`;
    return this.db
      .select({ weekday, hour, orders: sql<number>`count(*)::int` })
      .from(orderRequest)
      .where(this.buildWindow({ bounds, previous: false }))
      .groupBy(weekday, hour);
  }

  /** Best selling products of the period by revenue or by pieces. */
  async findTopProducts({
    bounds,
    sortBy,
  }: {
    bounds: PeriodBounds;
    sortBy: ProductSort;
  }): Promise<AnalyticsProductRow[]> {
    const rows = await this.db.execute<AnalyticsProductRow>(sql`
      SELECT
        s.product_id AS "productId",
        max(s.name) AS name,
        sum(s.amount)::text AS revenue,
        sum(s.qty)::int AS quantity
      FROM ${buildSoldLines(bounds.currentFrom)} s
      GROUP BY s.product_id
      ORDER BY ${sortBy === 'revenue' ? sql`sum(s.amount)` : sql`sum(s.qty)`} DESC, max(s.name)
      LIMIT ${TOP_PRODUCTS_LIMIT}
    `);
    return [...rows];
  }

  /** Every category that sold something, with the revenue of its whole subtree. */
  async findCategoryRevenue(bounds: PeriodBounds): Promise<CategoryRevenueRow[]> {
    const rows = await this.db.execute<CategoryRevenueRow>(sql`
      WITH RECURSIVE closure(ancestor_id, id) AS (
        SELECT id, id FROM category
        UNION ALL
        SELECT closure.ancestor_id, child.id FROM closure JOIN category child ON child.parent_id = closure.id
      )
      SELECT c.id, c.name, c.parent_id AS "parentId", sum(s.amount)::text AS revenue
      FROM category c
      JOIN closure ON closure.ancestor_id = c.id
      JOIN product p ON p.category_id = closure.id
      JOIN ${buildSoldLines(bounds.currentFrom)} s ON s.product_id = p.id
      GROUP BY c.id
    `);
    return [...rows];
  }

  /** Collections with the highest revenue of the period. */
  async findCollectionRevenue(bounds: PeriodBounds): Promise<AnalyticsCollectionRow[]> {
    const rows = await this.db.execute<AnalyticsCollectionRow>(sql`
      SELECT col.id, col.name, sum(s.amount)::text AS revenue
      FROM collection col
      JOIN product p ON p.collection_id = col.id
      JOIN ${buildSoldLines(bounds.currentFrom)} s ON s.product_id = p.id
      GROUP BY col.id
      ORDER BY sum(s.amount) DESC, col.name
      LIMIT ${TOP_SHORT_LIMIT}
    `);
    return [...rows];
  }

  /** Cities with the most delivery orders of the period. */
  async findCityCounts(bounds: PeriodBounds): Promise<AnalyticsCityRow[]> {
    const city = sql<string>`btrim(${orderRequest.city})`;
    const orders = sql<number>`count(*)::int`;
    return this.db
      .select({ city, orders })
      .from(orderRequest)
      .where(
        and(
          this.buildWindow({ bounds, previous: false }),
          sql`${orderRequest.deliveryMethod} = 'delivery'`,
          sql`btrim(coalesce(${orderRequest.city}, '')) <> ''`,
        ),
      )
      .groupBy(city)
      .orderBy(desc(orders), city)
      .limit(TOP_SHORT_LIMIT);
  }

  /** Whether the database knows the time zone name; it accepts the aliases a browser may report. */
  async hasTimeZone(name: string): Promise<boolean> {
    const rows = await this.db.execute<{ found: boolean }>(
      sql`SELECT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = ${name}) AS found`,
    );
    return rows[0].found;
  }

  /** Counts of products that need attention. The conditions are the same as the product list filters, so a tile and its list always agree. */
  async findCatalogHealth(): Promise<AnalyticsCatalogHealth> {
    const rows = await this.db.execute<AnalyticsCatalogHealth>(sql`
      SELECT
        (count(*) FILTER (WHERE t.is_out_of_stock))::int AS "outOfStock",
        (count(*) FILTER (WHERE t.has_no_photo))::int AS "withoutPhoto",
        (count(*) FILTER (WHERE t.is_hidden))::int AS "hidden",
        (count(*) FILTER (WHERE t.has_no_collection))::int AS "withoutCollection",
        (count(*) FILTER (WHERE t.is_not_ordered))::int AS "notOrdered"
      FROM (
        SELECT
          p.stock_status = 'out_of_stock' AS is_out_of_stock,
          ${buildNoPhotoCondition(sql`p.id`)} AS has_no_photo,
          NOT p.is_published AS is_hidden,
          p.collection_id IS NULL AS has_no_collection,
          ${buildNotOrderedCondition(sql`p.id`)} AS is_not_ordered
        FROM product p
      ) t
    `);
    return rows[0];
  }

  private pickCounts<TKey extends string>({
    rows,
    kind,
  }: {
    rows: readonly BreakdownRow[];
    kind: BreakdownRow['kind'];
  }): AnalyticsCount<TKey>[] {
    return rows.filter((row) => row.kind === kind).map((row) => ({ key: row.key as TKey, count: row.count }));
  }

  private buildWindow({ bounds, previous }: { bounds: PeriodBounds; previous: boolean }): SQL | undefined {
    return previous
      ? and(
          gte(orderRequest.createdAt, sql`${bounds.previousFrom}`),
          lt(orderRequest.createdAt, sql`${bounds.currentFrom}`),
        )
      : gte(orderRequest.createdAt, sql`${bounds.currentFrom}`);
  }
}
