import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_ADMIN_ROUTE = 'isPublicAdminRoute';

/**
 * Marks an `/api/admin/*` route (such as login) that does not require the admin cookie.
 */
export const PublicAdminRoute = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_ADMIN_ROUTE, true);
