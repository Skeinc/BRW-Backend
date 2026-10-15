/**
 * True when at least one property of the object is not `undefined`. An UPDATE with nothing to set is an error
 * in Drizzle, so services skip the query for an empty PATCH body.
 */
export function hasDefinedValues(values: object): boolean {
  return Object.values(values).some((value) => value !== undefined);
}
