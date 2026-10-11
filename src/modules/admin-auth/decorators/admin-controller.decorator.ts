import { applyDecorators, Controller, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AdminGuard } from '../guards/admin.guard.js';

/**
 * Declares a controller under `/api/admin/<path>` that is protected by AdminGuard and documented as cookie-authenticated.
 */
export function AdminController(path: string): ClassDecorator {
  return applyDecorators(
    Controller(`admin/${path}`),
    UseGuards(AdminGuard),
    ApiCookieAuth(),
    ApiUnauthorizedResponse({ description: 'Admin login cookie is missing, invalid or expired' }),
  );
}
