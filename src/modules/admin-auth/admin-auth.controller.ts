import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import type { EnvironmentVariables } from '../../config/environment-variables.js';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_TOKEN_TTL_SECONDS,
  LOGIN_THROTTLE_LIMIT,
  LOGIN_THROTTLE_TTL_MS,
} from './constants/admin-auth.constants.js';
import { AdminAuthService } from './admin-auth.service.js';
import type { AdminProfile } from './types/admin-auth.types.js';
import { PublicAdminRoute } from './decorators/public-admin-route.decorator.js';
import { LoginDto } from './dto/login.dto.js';

type AdminRequest = Request & { admin?: AdminProfile };

/** HTTP endpoints of admin auth under `/api/admin/auth` (admin cookie required). */
@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  private readonly isCookieSecure: boolean;

  constructor(
    private readonly adminAuthService: AdminAuthService,
    configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.isCookieSecure = configService.getOrThrow('COOKIE_SECURE', { infer: true });
  }

  /**
   * Logs the admin in and sets the httpOnly auth cookie. Limited to 5 attempts per minute.
   */
  @Post('login')
  @PublicAdminRoute()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: LOGIN_THROTTLE_LIMIT, ttl: LOGIN_THROTTLE_TTL_MS } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with ADMIN_EMAIL and the admin password' })
  @ApiOkResponse({ description: 'Logged in; the auth cookie is set' })
  @ApiUnauthorizedResponse({ description: 'UNAUTHORIZED: wrong email or password' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<AdminProfile> {
    const token: string = await this.adminAuthService.login(dto);
    res.cookie(ADMIN_COOKIE_NAME, token, this.buildCookieOptions(ADMIN_TOKEN_TTL_SECONDS * 1000));
    return { email: dto.email.trim().toLowerCase() };
  }

  /**
   * Clears the auth cookie. Safe to call without a session.
   */
  @Post('logout')
  @PublicAdminRoute()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Log out (clears the auth cookie)' })
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(ADMIN_COOKIE_NAME, this.buildCookieOptions());
  }

  /**
   * Returns the logged-in admin.
   */
  @Get('me')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Current admin' })
  @ApiOkResponse({ description: 'The logged-in admin' })
  @ApiUnauthorizedResponse({ description: 'UNAUTHORIZED: no valid auth cookie' })
  getProfile(@Req() req: AdminRequest): AdminProfile {
    return { email: req.admin?.email ?? '' };
  }

  private buildCookieOptions(maxAge?: number): CookieOptions {
    return { httpOnly: true, sameSite: 'lax', secure: this.isCookieSecure, path: '/', maxAge };
  }
}
