/** class-transformer step: trims a string and turns a blank one into undefined, so optional fields can be left empty. */
export function emptyToUndefined({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() || undefined : value;
}
