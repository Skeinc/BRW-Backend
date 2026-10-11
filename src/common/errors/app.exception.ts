import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-code.js';

type AppExceptionBody = {
  code: ErrorCode;
  message: string;
  details: unknown;
};

/**
 * Domain HTTP exception that always carries a stable ErrorCode for clients.
 */
export class AppException extends HttpException {
  readonly code: ErrorCode;
  readonly details: unknown;

  constructor(code: ErrorCode, status: HttpStatus, message: string, details: unknown = null) {
    const body: AppExceptionBody = { code, message, details };
    super(body, status);
    this.code = code;
    this.details = details;
  }
}
