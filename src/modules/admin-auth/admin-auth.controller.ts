import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import type { EnvironmentVariables } from '../../config/environment-variables.js';
import { ADMIN_COOKIE_NAME } from './admin-cookie-name.js';
import { AdminAuthService } from './admin-auth.service.js';
import type { AdminProfile } from './admin-auth.types.js';
import { LoginDto } from './dto/login.dto.js';
import { AdminGuard } from './guards/admin.guard.js';

const LOGIN_LIMIT_PER_MINUTE = 5;
const LOGIN_WINDOW_MS = 60_000;

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  private readonly isCookieSecure: boolean;

  constructor(
    configService: ConfigService<EnvironmentVariables, true>,
    private readonly adminAuthService: AdminAuthService,
  ) {
    this.isCookieSecure = configService.getOrThrow('COOKIE_SECURE', { infer: true });
  }

  /**
   * Verifies ADMIN_EMAIL and the password and sets the httpOnly session cookie.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: LOGIN_LIMIT_PER_MINUTE, ttl: LOGIN_WINDOW_MS } })
  @ApiOperation({ summary: 'Log in as admin and receive the session cookie' })
  @ApiOkResponse({ description: 'Logged in; the session cookie is set' })
  @ApiUnauthorizedResponse({ description: 'Wrong email or password' })
  @ApiTooManyRequestsResponse({ description: 'More than 5 login attempts per minute' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<AdminProfile> {
    const session = await this.adminAuthService.login(dto);
    res.cookie(ADMIN_COOKIE_NAME, session.token, { ...this.buildCookieOptions(), maxAge: session.maxAgeMs });
    return { email: dto.email.toLowerCase() };
  }

  /**
   * Clears the session cookie.
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Log out and clear the session cookie' })
  @ApiUnauthorizedResponse({ description: 'Admin login cookie is missing, invalid or expired' })
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(ADMIN_COOKIE_NAME, this.buildCookieOptions());
  }

  /**
   * Returns the logged-in admin.
   */
  @Get('me')
  @UseGuards(AdminGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Current admin' })
  @ApiOkResponse({ description: 'The logged-in admin' })
  @ApiUnauthorizedResponse({ description: 'Admin login cookie is missing, invalid or expired' })
  async getMe(@Req() req: Request): Promise<AdminProfile> {
    return this.adminAuthService.authenticate(req.cookies?.[ADMIN_COOKIE_NAME]);
  }

  private buildCookieOptions(): CookieOptions {
    return { httpOnly: true, sameSite: 'lax', secure: this.isCookieSecure, path: '/' };
  }
}
