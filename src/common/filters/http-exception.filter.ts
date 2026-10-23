import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-code.js';

const MIN_CLIENT_ERROR_STATUS = 400;
const MIN_SERVER_ERROR_STATUS = 500;

type ErrorBody = {
  code: string;
  message: string;
  details: unknown;
};

/** Maps any thrown error to the `{ code, message, details }` response body. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * Maps any thrown error to `{ code, message, details }`.
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const status = this.resolveStatus(exception);
    const body = this.buildBody(exception, status);
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.path}`,
        exception instanceof Error ? exception.stack : body.message,
      );
    } else {
      this.logger.warn(`${request.method} ${request.path} ${status} ${body.code}: ${body.message}`);
    }
    response.status(status).json(body);
  }

  private resolveStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    if (this.isExposedClientError(exception)) {
      return exception.status;
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private buildBody(exception: unknown, status: number): ErrorBody {
    if (exception instanceof AppException) {
      const response = exception.getResponse();
      let message = exception.message;
      if (typeof response === 'object' && response !== null && 'message' in response) {
        const { message: responseMessage } = response;
        if (typeof responseMessage === 'string') {
          message = responseMessage;
        }
      }
      return {
        code: exception.code,
        message,
        details: exception.details,
      };
    }
    if (exception instanceof HttpException) {
      return this.buildHttpBody(exception);
    }
    if (this.isExposedClientError(exception)) {
      return { code: this.statusToCode(status), message: exception.message, details: null };
    }
    return {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
      details: null,
    };
  }

  /** Body-parser throws `http-errors` (413, malformed JSON) that are safe to show: they carry `expose` and a 4xx status. */
  private isExposedClientError(exception: unknown): exception is Error & { status: number } {
    if (!(exception instanceof Error)) {
      return false;
    }
    const { status, expose } = exception as { status?: unknown; expose?: unknown };
    return (
      expose === true &&
      typeof status === 'number' &&
      status >= MIN_CLIENT_ERROR_STATUS &&
      status < MIN_SERVER_ERROR_STATUS
    );
  }

  private buildHttpBody(exception: HttpException): ErrorBody {
    const status = exception.getStatus();
    const response = exception.getResponse();
    if (this.isValidationResponse(response)) {
      return {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details: response.message,
      };
    }
    return {
      code: this.statusToCode(status),
      message: this.extractMessage(response, exception.message),
      details: null,
    };
  }

  private isValidationResponse(response: string | object): response is { message: string[]; statusCode: number } {
    if (typeof response !== 'object' || response === null) {
      return false;
    }
    const payload = response as { message?: unknown; statusCode?: number };
    return payload.statusCode === HttpStatus.BAD_REQUEST && Array.isArray(payload.message);
  }

  private extractMessage(response: string | object, fallback: string): string {
    if (typeof response === 'string') {
      return response;
    }
    if (typeof response === 'object' && response !== null && 'message' in response) {
      const { message } = response;
      if (typeof message === 'string') {
        return message;
      }
      if (Array.isArray(message)) {
        return 'Validation failed';
      }
    }
    return fallback;
  }

  private statusToCode(status: number): ErrorCode {
    const codes: Record<number, ErrorCode> = {
      [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
      [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
      [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
      [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
      [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
      [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCode.PAYLOAD_TOO_LARGE,
      [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCode.UNPROCESSABLE_ENTITY,
      [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
      [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.SERVICE_UNAVAILABLE,
      [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCode.INTERNAL_ERROR,
    };
    return codes[status] ?? ErrorCode.HTTP_ERROR;
  }
}
