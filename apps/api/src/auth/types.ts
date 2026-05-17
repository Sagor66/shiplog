import type { Request } from 'express';

/**
 * Shape of the user object attached by {@link AuthGuard} to every
 * authenticated request. Kept narrower than Better Auth's full `User`
 * type so controllers don't accidentally depend on internal fields.
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subset of Better Auth's session row that's safe to expose to handlers.
 * Excludes raw cookie tokens and IP addresses we'd rather not echo.
 */
export interface SessionMeta {
  id: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Express request augmented with `user` and `session` populated by the
 * AuthGuard. Use this as the request type in protected controllers.
 */
export interface AuthenticatedRequest extends Request {
  user: SessionUser;
  session: SessionMeta;
}
