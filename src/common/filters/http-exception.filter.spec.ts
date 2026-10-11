import { ArgumentsHost, BadRequestException, HttpStatus, Logger, NotFoundException } from '@nestjs/common';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-code.js';
import { HttpExceptionFilter } from './http-exception.filter.js';

type FakeResponse = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };

function createResponse(): FakeResponse {
  const response: FakeResponse = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  return response;
}

function createHost(response: FakeResponse): ArgumentsHost {
  return { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost;
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps AppException to its code, message and details', () => {
    const response = createResponse();
    const exception = new AppException(ErrorCode.SERVICE_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE, 'Down', {
      db: 'error',
    });
    filter.catch(exception, createHost(response));
    expect(response.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(response.json).toHaveBeenCalledWith({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Down',
      details: { db: 'error' },
    });
  });

  it('maps validation failures to VALIDATION_ERROR with the messages as details', () => {
    const response = createResponse();
    const exception = new BadRequestException({
      statusCode: 400,
      message: ['name must be a string'],
      error: 'Bad Request',
    });
    filter.catch(exception, createHost(response));
    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: ['name must be a string'],
    });
  });

  it('maps plain HTTP exceptions to a status based code', () => {
    const response = createResponse();
    filter.catch(new NotFoundException('Cannot GET /api/nope'), createHost(response));
    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith({ code: 'NOT_FOUND', message: 'Cannot GET /api/nope', details: null });
  });

  it('hides the message of unexpected errors', () => {
    const response = createResponse();
    filter.catch(new Error('secret connection string'), createHost(response));
    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith({
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      details: null,
    });
  });
});
