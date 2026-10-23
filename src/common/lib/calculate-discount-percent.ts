import { toMinorUnits } from './to-minor-units.js';

const PERCENT = 100n;

/** Whole discount percent (rounded down) when `oldPrice` is above `price`, otherwise null. */
export function calculateDiscountPercent({
  price,
  oldPrice,
}: {
  price: string;
  oldPrice: string | null;
}): number | null {
  if (oldPrice === null) {
    return null;
  }
  const current: bigint = toMinorUnits(price);
  const previous: bigint = toMinorUnits(oldPrice);
  if (previous <= current) {
    return null;
  }
  return Number(((previous - current) * PERCENT) / previous);
}
