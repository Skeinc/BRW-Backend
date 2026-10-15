const UNIQUE_VIOLATION_CODE = '23505';

type DatabaseErrorLike = { code?: unknown; cause?: unknown };

/**
 * Returns true when the error (or its cause) is a Postgres unique-constraint violation.
 */
export function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) {
    return false;
  }
  const { code, cause } = err as DatabaseErrorLike;
  return code === UNIQUE_VIOLATION_CODE || isUniqueViolation(cause);
}
