import { Controller, Get, HttpCode, HttpStatus, Inject, Logger } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.js';
import { StorageService } from '../../common/storage/storage.service.js';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';

type ComponentStatus = 'ok' | 'error';

export type HealthResponse = {
  status: ComponentStatus;
  db: ComponentStatus;
  storage: ComponentStatus;
};

const toStatus = (isUp: boolean): ComponentStatus => (isUp ? 'ok' : 'error');

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @Inject(DRIZZLE)
    private readonly database: DrizzleDatabase,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Checks that the API can reach Postgres (select 1) and the S3 bucket (HeadBucket).
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'API, database and storage are reachable',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        db: { type: 'string', example: 'ok' },
        storage: { type: 'string', example: 'ok' },
      },
    },
  })
  @ApiServiceUnavailableResponse({ description: 'Database or storage is unreachable; details tell which one' })
  async check(): Promise<HealthResponse> {
    const [isDatabaseUp, isStorageUp] = await Promise.all([
      this.isDatabaseReachable(),
      this.storageService.isBucketReachable(),
    ]);
    const response: HealthResponse = {
      status: toStatus(isDatabaseUp && isStorageUp),
      db: toStatus(isDatabaseUp),
      storage: toStatus(isStorageUp),
    };
    if (response.status === 'error') {
      throw new AppException(
        ErrorCode.SERVICE_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE,
        'Service is unavailable',
        response,
      );
    }
    return response;
  }

  private async isDatabaseReachable(): Promise<boolean> {
    try {
      await this.database.execute(sql`select 1`);
      return true;
    } catch (err) {
      this.logger.warn(`Database check failed: ${err instanceof Error ? err.name : 'unknown error'}`);
      return false;
    }
  }
}
