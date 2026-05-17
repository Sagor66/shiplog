import { Logger, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { createAuth, type AuthLogger, type ShipLogAuth } from '@shiplog/auth';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AUTH_INSTANCE } from './auth.tokens.js';
import { CsrfMiddleware } from './csrf.middleware.js';
import { AuthGuard } from './guards/auth.guard.js';
import { ApiEmailService } from './email/api-email.service.js';

/**
 * Wires Better Auth, the AuthGuard, CSRF middleware, and global rate
 * limiting into the NestJS request pipeline.
 *
 * Design intent — see also `packages/auth/src/index.ts`:
 *
 *   1. The Better Auth INSTANCE is shared with `apps/web`. Both call
 *      `createAuth` with the same `BETTER_AUTH_SECRET`, so cookies issued
 *      by Next.js validate cleanly in NestJS.
 *
 *   2. The HTTP login/signup endpoints are NOT mounted here. The Next.js
 *      app owns them. NestJS only uses Better Auth's server SDK
 *      (`auth.api.getSession`) for session validation.
 *
 *   3. `AuthGuard` is registered globally via `APP_GUARD`. Every route
 *      requires a valid, email-verified session unless opted out with
 *      `@Public()`.
 *
 *   4. `CsrfMiddleware` runs on every route (path = '*') and rejects
 *      non-GET requests whose `X-ShipLog-CSRF` header doesn't match the
 *      `shiplog.csrf` cookie. Belt and suspenders with Better Auth's
 *      Origin check.
 *
 *   5. `ThrottlerModule` provides defense-in-depth rate limiting on
 *      everything the API exposes (Better Auth's per-endpoint limits
 *      still apply on the Next.js side of the house).
 */
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60_000,
        limit: 100,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    ApiEmailService,
    {
      provide: AUTH_INSTANCE,
      inject: [ConfigService, ApiEmailService],
      useFactory: (
        config: ConfigService,
        emailService: ApiEmailService,
      ): ShipLogAuth => {
        const secret = config.getOrThrow<string>('BETTER_AUTH_SECRET');
        const baseURL =
          config.get<string>('BETTER_AUTH_URL') ?? 'http://localhost:3000';
        const githubClientId = config.get<string>('GITHUB_CLIENT_ID');
        const githubClientSecret = config.get<string>('GITHUB_CLIENT_SECRET');
        const nestLogger = new Logger('BetterAuth');
        const logger: AuthLogger = {
          info: (obj, msg) => nestLogger.log(JSON.stringify({ ...obj, msg })),
          warn: (obj, msg) => nestLogger.warn(JSON.stringify({ ...obj, msg })),
          error: (obj, msg) =>
            nestLogger.error(JSON.stringify({ ...obj, msg })),
        };
        return createAuth({
          baseURL,
          secret,
          isProduction: config.get<string>('NODE_ENV') === 'production',
          github:
            githubClientId && githubClientSecret
              ? { clientId: githubClientId, clientSecret: githubClientSecret }
              : undefined,
          logger,
          emailService,
        });
      },
    },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [AuthService, AUTH_INSTANCE],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply double-submit CSRF check to every route. Routes that need to
    // bypass (webhooks, etc.) should NOT be hosted under /v1/* — mount
    // them at /webhooks/* and exclude here.
    consumer.apply(CsrfMiddleware).forRoutes('*');
  }
}
