import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import type { EnvironmentVariables } from '../../config/environment-variables.js';
import { AdminAuthController } from './admin-auth.controller.js';
import { AdminAuthService } from './admin-auth.service.js';

const DEFAULT_THROTTLE_LIMIT = 5;
const DEFAULT_THROTTLE_TTL_MS = 60_000;

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables, true>) => ({
        secret: configService.getOrThrow('JWT_SECRET', { infer: true }),
      }),
    }),
    ThrottlerModule.forRoot([{ limit: DEFAULT_THROTTLE_LIMIT, ttl: DEFAULT_THROTTLE_TTL_MS }]),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}
