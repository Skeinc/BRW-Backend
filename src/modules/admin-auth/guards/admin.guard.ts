import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ADMIN_COOKIE_NAME } from '../admin-cookie-name.js';
import { AdminAuthService } from '../admin-auth.service.js';

/**
 * Lets a request through only when it carries a valid admin JWT cookie; otherwise responds 401 UNAUTHORIZED.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token: string | undefined = request.cookies?.[ADMIN_COOKIE_NAME];
    await this.adminAuthService.authenticate(token);
    return true;
  }
}
