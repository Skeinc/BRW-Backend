import type { AnalyticsCount } from '../types/analytics.types.js';

/** Returns a count for every key in the given order; a key the query did not return gets zero. */
export function fillCounts<TKey extends string>({
  keys,
  counts,
}: {
  keys: readonly TKey[];
  counts: AnalyticsCount<TKey>[];
}): AnalyticsCount<TKey>[] {
  return keys.map((key) => ({ key, count: counts.find((item) => item.key === key)?.count ?? 0 }));
}
