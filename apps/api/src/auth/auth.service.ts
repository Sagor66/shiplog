import { Inject, Injectable } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';

import type { ShipLogAuth } from '@shiplog/auth';

import type { SessionMeta, SessionUser } from './types.js';
import { AUTH_INSTANCE } from './auth.tokens.js';

/**
 * Application service for auth validation. Wraps Better Auth's server API
 * so controllers and guards never import Better Auth directly — they
 * depend on this Nest provider instead, which keeps the wire format
 * stable as Better Auth evolves.
 */
@Injectable()
export class AuthService {
  constructor(@Inject(AUTH_INSTANCE) private readonly auth: ShipLogAuth) {}

  /**
   * Validate the session cookie on the request and return the user and
   * session metadata. Returns `null` for missing or expired sessions.
   *
   * Implementation note: we convert Node `IncomingHttpHeaders` to a
   * Web `Headers` object because Better Auth's API is built on the Web
   * platform, not Express. `fromNodeHeaders` is provided by Better Auth
   * specifically for this Node ↔ Web bridge.
   */
  async validateRequest(
    rawHeaders: NodeJS.Dict<string | string[]>,
  ): Promise<{ user: SessionUser; session: SessionMeta } | null> {
    const result = await this.auth.api.getSession({
      headers: fromNodeHeaders(rawHeaders),
    });

    if (!result) return null;

    const { user, session } = result;
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    };
  }
}
