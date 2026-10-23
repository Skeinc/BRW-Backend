import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from './analytics.repository.js';
import {
  ANALYTICS_PERIOD_DAYS,
  DEFAULT_ANALYTICS_PERIOD,
  DEFAULT_ANALYTICS_TIME_ZONE,
} from './constants/analytics.constants.js';
import type { AnalyticsQueryDto } from './dto/analytics-query.dto.js';
import { buildCategoryRows } from './lib/build-category-rows.js';
import { buildPeriodBounds } from './lib/build-period-bounds.js';
import { buildTimeZoneLiteral } from './lib/build-time-zone-literal.js';
import { fillCounts } from './lib/fill-counts.js';
import type { AnalyticsReport } from './types/analytics.types.js';

const ORDER_STATUSES = ['new', 'in_progress', 'done', 'cancelled'] as const;
const PAYMENT_METHODS = ['cash_on_delivery', 'installment', 'bank_transfer'] as const;
const DELIVERY_METHODS = ['delivery', 'pickup'] as const;

/** Builds the admin analytics report of orders and the catalog for one period. */
@Injectable()
export class AnalyticsService {
  /** Names the database already confirmed, so it is asked once for each. */
  private readonly knownTimeZones = new Set<string>();

  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  /**
   * Everything the analytics page shows for the last N days and for the N days before them. The queries run in two
   * batches, so one report holds at most six connections of the pool at once.
   */
  async getReport({ period = DEFAULT_ANALYTICS_PERIOD, timeZone }: AnalyticsQueryDto): Promise<AnalyticsReport> {
    const zone = await this.resolveTimeZone(timeZone);
    const bounds = buildPeriodBounds({ days: ANALYTICS_PERIOD_DAYS[period], timeZone: buildTimeZoneLiteral(zone) });
    const repository = this.analyticsRepository;
    const [current, previous, daily, breakdowns, activity, catalogHealth] = await Promise.all([
      repository.findTotals({ bounds, previous: false }),
      repository.findTotals({ bounds, previous: true }),
      repository.findDaily(bounds),
      repository.findBreakdowns(bounds),
      repository.findActivity(bounds),
      repository.findCatalogHealth(),
    ]);
    const [byRevenue, byQuantity, categories, collections, cities] = await Promise.all([
      repository.findTopProducts({ bounds, sortBy: 'revenue' }),
      repository.findTopProducts({ bounds, sortBy: 'quantity' }),
      repository.findCategoryRevenue(bounds),
      repository.findCollectionRevenue(bounds),
      repository.findCityCounts(bounds),
    ]);
    return {
      period,
      timeZone: zone,
      from: daily[0].date,
      to: daily[daily.length - 1].date,
      current,
      previous,
      daily,
      statuses: fillCounts({ keys: ORDER_STATUSES, counts: breakdowns.statuses }),
      payments: fillCounts({ keys: PAYMENT_METHODS, counts: breakdowns.payments }),
      deliveries: fillCounts({ keys: DELIVERY_METHODS, counts: breakdowns.deliveries }),
      activity,
      topProductsByRevenue: byRevenue,
      topProductsByQuantity: byQuantity,
      categories: buildCategoryRows(categories),
      collections,
      cities,
      catalogHealth,
    };
  }

  /** The requested zone when the database knows it, otherwise the default one. */
  private async resolveTimeZone(requested: string | undefined): Promise<string> {
    if (requested === undefined) {
      return DEFAULT_ANALYTICS_TIME_ZONE;
    }
    if (this.knownTimeZones.has(requested)) {
      return requested;
    }
    if (!(await this.analyticsRepository.hasTimeZone(requested))) {
      return DEFAULT_ANALYTICS_TIME_ZONE;
    }
    this.knownTimeZones.add(requested);
    return requested;
  }
}
