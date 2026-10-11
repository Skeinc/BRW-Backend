import { HttpStatus } from '@nestjs/common';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-code.js';

/**
 * PATCH bodies use `null` to clear optional columns. Fields in `requiredKeys` cannot be cleared, so `null` is a 400.
 */
export function rejectNullFields<T extends object>({ dto, requiredKeys }: { dto: T; requiredKeys: (keyof T)[] }): void {
  const nullKeys: string[] = requiredKeys.filter((key) => dto[key] === null).map(String);
  if (nullKeys.length === 0) {
    return;
  }
  throw new AppException(
    ErrorCode.VALIDATION_ERROR,
    HttpStatus.BAD_REQUEST,
    'Validation failed',
    nullKeys.map((key) => `${key} cannot be null`),
  );
}
