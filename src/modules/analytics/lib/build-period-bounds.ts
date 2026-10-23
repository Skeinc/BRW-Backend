import { sql, type SQL } from 'drizzle-orm';
import type { PeriodBounds } from '../types/analytics.types.js';

/** SQL for the start of the day that is `offsetDays` before today in `timeZone`. */
function buildDayStart({ offsetDays, timeZone }: { offsetDays: number; timeZone: SQL }): SQL {
  return sql`((date_trunc('day', now() AT TIME ZONE ${timeZone}) - make_interval(days => ${offsetDays}::int)) AT TIME ZONE ${timeZone})`;
}

/** Bounds of the last `days` days (today included) and of the `days` days before them, in `timeZone`. */
export function buildPeriodBounds({ days, timeZone }: { days: number; timeZone: SQL }): PeriodBounds {
  return {
    days,
    timeZone,
    currentFrom: buildDayStart({ offsetDays: days - 1, timeZone }),
    previousFrom: buildDayStart({ offsetDays: days * 2 - 1, timeZone }),
  };
}
