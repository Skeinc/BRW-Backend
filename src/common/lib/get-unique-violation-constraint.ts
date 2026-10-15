const UNIQUE_VIOLATION_CODE = '23505';

type DatabaseErrorLike = { code?: unknown; constraint_name?: unknown; cause?: unknown };

/**
 * Returns the violated constraint name when the error (or its cause) is a Postgres unique violation, otherwise undefined.
 */
export function getUniqueViolationConstraint(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) {
    return undefined;
  }
  const { code, constraint_name: constraintName, cause } = err as DatabaseErrorLike;
  if (code === UNIQUE_VIOLATION_CODE && typeof constraintName === 'string') {
    return constraintName;
  }
  return getUniqueViolationConstraint(cause);
}
