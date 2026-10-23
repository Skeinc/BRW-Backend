/** class-transformer step for query strings: a single value becomes a one-item array. */
export function toStringArray({ value }: { value: unknown }): unknown {
  if (value === undefined || Array.isArray(value)) {
    return value;
  }
  return [value];
}
