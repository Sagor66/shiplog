import { SetMetadata } from '@nestjs/common';

/**
 * Reflection key the AuthGuard checks to decide whether to skip auth.
 * Internal — consumers should use the {@link Public} decorator below.
 */
export const IS_PUBLIC_KEY = 'shiplog.auth.public';

/**
 * Mark a controller or handler as unauthenticated. Useful for health
 * checks, webhooks (which authenticate via their own signature), and
 * the GitHub OAuth callback bounce.
 *
 * @example
 *   @Public()
 *   @Get('healthz')
 *   health() { return { ok: true } }
 */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
