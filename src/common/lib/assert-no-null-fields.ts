import { HttpStatus } from '@nestjs/common';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-code.js';

type AssertNoNullFieldsInput = {
  dto: object;
  nullableFields: readonly string[];
};

/**
 * PATCH bodies treat `null` as "clear this field", which only makes sense for nullable columns.
 * Fails with VALIDATION_ERROR when a field that cannot be cleared is sent as `null`.
 */
export function assertNoNullFields({ dto, nullableFields }: AssertNoNullFieldsInput): void {
  const invalidFields: string[] = Object.entries(dto)
    .filter(([field, value]) => value === null && !nullableFields.includes(field))
    .map(([field]) => field);
  if (invalidFields.length > 0) {
    throw new AppException(
      ErrorCode.VALIDATION_ERROR,
      HttpStatus.BAD_REQUEST,
      'Validation failed',
      invalidFields.map((field) => `${field} must not be null`),
    );
  }
}
