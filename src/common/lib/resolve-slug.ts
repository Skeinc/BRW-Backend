import { HttpStatus } from '@nestjs/common';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-code.js';
import { slugify } from './slugify.js';

/**
 * Uses the slug passed by the admin, or builds one from the name. Throws 400 when the name has no letters or digits.
 */
export function resolveSlug({
  slug,
  name,
  maxLength,
}: {
  slug: string | undefined;
  name: string;
  maxLength: number;
}): string {
  const resolved: string = slug ?? slugify(name, maxLength);
  if (resolved.length > 0) {
    return resolved;
  }
  throw new AppException(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, 'Validation failed', [
    'slug cannot be generated from the name, pass it explicitly',
  ]);
}
