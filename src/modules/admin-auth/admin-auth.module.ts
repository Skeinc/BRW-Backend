import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import type { EnvironmentVariables } from '../../config/environment-variables.js';
import {
  ADMIN_TOKEN_TTL_SECONDS,
  LOGIN_THROTTLE_LIMIT,
  LOGIN_THROTTLE_TTL_MS,
} from './constants/admin-auth.constants.js';
import { AdminAuthController } from './admin-auth.controller.js';
import { AdminAuthService } from './admin-auth.service.js';
import { AdminGuard } from './guards/admin.guard.js';

/** Wires the admin auth feature. */
@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: LOGIN_THROTTLE_TTL_MS, limit: LOGIN_THROTTLE_LIMIT }]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables, true>) => ({
        secret: configService.getOrThrow('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: ADMIN_TOKEN_TTL_SECONDS },
      }),
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, { provide: APP_GUARD, useClass: AdminGuard }],
})
export class AdminAuthModule {}
