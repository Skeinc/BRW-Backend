/** class-transformer step for query strings: "true" and "false" become booleans, anything else is left for validation. */
export function toBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true') {
    return true;
  }
  return value === 'false' ? false : value;
}
