import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-code.js';

type ErrorBody = {
  code: string;
  message: string;
  details: unknown;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * Maps any thrown error to `{ code, message, details }`.
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.buildBody(exception);
    const status = this.resolveStatus(exception);
    if (status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : body.message);
    } else {
      this.logger.warn(body.message);
    }
    response.status(status).json(body);
  }

  private resolveStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private buildBody(exception: unknown): ErrorBody {
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
    return {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
      details: null,
    };
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

  private statusToCode(status: number): string {
    const codes: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.PAYLOAD_TOO_LARGE]: 'PAYLOAD_TOO_LARGE',
      [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: 'UNSUPPORTED_MEDIA_TYPE',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
      [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
      [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.SERVICE_UNAVAILABLE,
      [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCode.INTERNAL_ERROR,
    };
    return codes[status] ?? 'HTTP_ERROR';
  }
}
