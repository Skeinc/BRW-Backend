import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception.js';
import { ErrorCode } from './error-code.js';

/** 409 SLUG_TAKEN: another record already uses this slug. */
export class SlugTakenException extends AppException {
  constructor(slug: string) {
    super(ErrorCode.SLUG_TAKEN, HttpStatus.CONFLICT, `Slug "${slug}" is already taken`, { slug });
  }
}
