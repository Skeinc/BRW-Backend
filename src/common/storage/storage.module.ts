import { S3Client } from '@aws-sdk/client-s3';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/environment-variables.js';
import { S3_CLIENT } from './s3-client.constant.js';
import { StorageService } from './storage.service.js';

@Global()
@Module({
  providers: [
    {
      provide: S3_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables, true>): S3Client =>
        new S3Client({
          endpoint: configService.getOrThrow('S3_ENDPOINT', { infer: true }),
          region: configService.getOrThrow('S3_REGION', { infer: true }),
          forcePathStyle: configService.getOrThrow('S3_FORCE_PATH_STYLE', { infer: true }),
          credentials: {
            accessKeyId: configService.getOrThrow('S3_ACCESS_KEY', { infer: true }),
            secretAccessKey: configService.getOrThrow('S3_SECRET_KEY', { infer: true }),
          },
        }),
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
