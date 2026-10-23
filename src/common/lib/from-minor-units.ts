import { MINOR_UNIT_DIGITS } from './minor-units.constants.js';

/** Converts whole minor units (129950n) back to a numeric string with two decimals ("1299.50"). */
export function fromMinorUnits(minorUnits: bigint): string {
  const digits: string = minorUnits.toString().padStart(MINOR_UNIT_DIGITS + 1, '0');
  const splitAt: number = digits.length - MINOR_UNIT_DIGITS;
  return `${digits.slice(0, splitAt)}.${digits.slice(splitAt)}`;
}
