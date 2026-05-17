import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { AuthService } from '../auth.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { EmailNotVerifiedError } from '../errors/email-not-verified.error.js';
import { UnauthorizedError } from '../errors/unauthorized.error.js';
import type { AuthenticatedRequest } from '../types.js';

/**
 * Validates the session cookie on every request that is not marked
 * `@Public()`. Three outcomes:
 *
 *   - Valid, verified session  → attach `user` + `session` to request, allow.
 *   - Valid, but email not verified → throw {@link EmailNotVerifiedError} (403).
 *   - No or invalid session → throw {@link UnauthorizedError} (401).
 *
 * The guard is registered globally in {@link AuthModule}. Routes that
 * need to be reachable unauthenticated must explicitly opt out with
 * `@Public()` — defaulting to closed is safer than defaulting to open.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const result = await this.authService.validateRequest(req.headers);

    if (!result) {
      this.logger.debug(
        `auth.session.missing path=${req.method} ${req.originalUrl}`,
      );
      throw new UnauthorizedError('session_missing_or_expired');
    }

    if (!result.user.emailVerified) {
      this.logger.debug(
        `auth.session.email_not_verified user_id=${result.user.id}`,
      );
      throw new EmailNotVerifiedError();
    }

    const authedReq = req as AuthenticatedRequest;
    authedReq.user = result.user;
    authedReq.session = result.session;
    return true;
  }
}
