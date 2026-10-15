import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AdminAuthService } from '../admin-auth.service.js';
import { ADMIN_COOKIE_NAME, ADMIN_ROUTE_PREFIX } from '../constants/admin-auth.constants.js';
import type { AdminProfile } from '../types/admin-auth.types.js';
import { IS_PUBLIC_ADMIN_ROUTE } from '../decorators/public-admin-route.decorator.js';

type AdminRequest = Request & { admin?: AdminProfile };

/**
 * Registered globally: every `/api/admin/*` route requires a valid admin cookie unless marked `@PublicAdminRoute()`.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  /**
   * Allows non-admin routes and public admin routes; otherwise verifies the cookie token.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: AdminRequest = context.switchToHttp().getRequest<AdminRequest>();
    if (!this.isAdminRoute(request) || this.isPublicRoute(context)) {
      return true;
    }
    const token: unknown = (request.cookies as Record<string, unknown> | undefined)?.[ADMIN_COOKIE_NAME];
    if (typeof token !== 'string' || token.length === 0) {
      throw this.adminAuthService.buildUnauthorizedException('Authentication required');
    }
    request.admin = await this.adminAuthService.verifyToken(token);
    return true;
  }

  private isAdminRoute(request: Request): boolean {
    const [pathname] = request.originalUrl.split('?');
    return `${pathname.toLowerCase().replace(/\/+$/, '')}/`.startsWith(ADMIN_ROUTE_PREFIX);
  }

  private isPublicRoute(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ADMIN_ROUTE, [context.getHandler(), context.getClass()]) ??
      false
    );
  }
}
