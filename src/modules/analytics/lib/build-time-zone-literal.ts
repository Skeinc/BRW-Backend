import { sql, type SQL } from 'drizzle-orm';
import { TIME_ZONE_PATTERN } from '../constants/analytics.constants.js';

/**
 * The zone as an inlined SQL literal: a bound parameter would get a new number in every use and the `GROUP BY`
 * expressions would stop matching the selected ones. The name is checked against `TIME_ZONE_PATTERN` first, so
 * it can not carry a quote or any other SQL.
 */
export function buildTimeZoneLiteral(timeZone: string): SQL {
  if (!TIME_ZONE_PATTERN.test(timeZone)) {
    throw new Error('Time zone name has characters that are not allowed');
  }
  return sql.raw(`'${timeZone}'`);
}
