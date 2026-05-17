import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { AuthenticatedRequest, SessionUser } from '../types.js';

/**
 * Inject the authenticated user into a controller method. Requires that
 * the request has already been processed by {@link AuthGuard} — the
 * guard attaches `request.user` and `request.session` after validating
 * the session cookie.
 *
 * If the route is decorated with {@link Public}, this returns `null`
 * rather than throwing, so handlers that opportunistically use the
 * user (eg. a public page that personalizes when signed in) work
 * naturally.
 *
 * @example
 *   @Get('me')
 *   getMe(@CurrentUser() user: SessionUser) {
 *     return { email: user.email }
 *   }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser | null => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest | Request>();
    return 'user' in req && req.user ? req.user : null;
  },
);
