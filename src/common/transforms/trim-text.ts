/** class-transformer step: trims a string and leaves any other value untouched. */
export function trimText({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
