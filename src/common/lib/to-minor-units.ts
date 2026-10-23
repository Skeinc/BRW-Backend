import { MINOR_UNIT_DIGITS } from './minor-units.constants.js';

const PRICE_FORMAT = /^\d+(\.\d+)?$/;

/** Converts a price string such as "1299.5" to whole minor units (129950n), without floating point. */
export function toMinorUnits(price: string): bigint {
  if (!PRICE_FORMAT.test(price)) {
    throw new TypeError(`Not a price: "${price}"`);
  }
  const [whole, fraction = ''] = price.split('.');
  return BigInt(`${whole}${fraction.padEnd(MINOR_UNIT_DIGITS, '0').slice(0, MINOR_UNIT_DIGITS)}`);
}
