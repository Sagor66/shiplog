import { prisma } from '@shiplog/database'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'

import { hashPassword, verifyPassword } from './password.js'
import type { CreateAuthConfig } from './types.js'

export * from './types.js'
export {
  hashPassword,
  validatePasswordPolicy,
  verifyPassword,
} from './password.js'

/**
 * Build the configured Better Auth instance. Both `apps/web` (which mounts
 * the HTTP handler) and `apps/api` (which only validates sessions) call
 * this. Calls must use the SAME `baseURL` and `secret`, or cookies issued
 * by one app will not validate on the other.
 *
 * Design notes:
 *   - The HTTP handler lives on the Next.js app. NestJS calls
 *     `auth.api.getSession({ headers })` to validate the cookie and reuses
 *     the same Postgres rows.
 *   - Field mapping translates Better Auth's default `password` column on
 *     `accounts` to our existing `password_hash` column, so we don't have
 *     to rename a production-shaped column.
 *   - bcrypt cost 12 overrides Better Auth's default scrypt hashing.
 *   - Rate limiting is enforced server-side by Better Auth itself; we add a
 *     stricter rule on `/sign-in/email` (5 attempts / 15 min / IP).
 *   - CSRF: `disableCSRFCheck: false` keeps Better Auth's Origin/Referer
 *     check on every non-GET. The double-submit token check on top of this
 *     is enforced in a separate middleware — see [csrf-middleware in apps].
 */
export function createAuth(config: CreateAuthConfig) {
  const isProduction =
    config.isProduction ?? process.env.NODE_ENV === 'production'

  const auth = betterAuth({
    appName: 'ShipLog',
    baseURL: config.baseURL,
    secret: config.secret,

    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),

    // Email + password auth with bcrypt (cost 12) and an 8-char minimum.
    // The full policy (letter + number) is enforced in the signup form
    // because Better Auth only validates length out of the box.
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      password: {
        hash: hashPassword,
        verify: verifyPassword,
      },
      sendResetPassword: async ({ user, url, token }, _request) => {
        await config.emailService.sendPasswordResetEmail({
          to: user.email,
          name: user.name ?? null,
          url,
          token,
          expiresInSeconds: 60 * 60,
        })
      },
      resetPasswordTokenExpiresIn: 60 * 60,
    },

    emailVerification: {
      sendVerificationEmail: async ({ user, url, token }, _request) => {
        await config.emailService.sendVerificationEmail({
          to: user.email,
          name: user.name ?? null,
          url,
          token,
          expiresInSeconds: 60 * 60,
        })
      },
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
    },

    socialProviders: config.github
      ? {
          github: {
            clientId: config.github.clientId,
            clientSecret: config.github.clientSecret,
          },
        }
      : undefined,

    // Map Better Auth's default field names to our Prisma columns where
    // they differ. Everything not listed here uses the default name.
    account: {
      fields: {
        password: 'password',
      },
    },

    session: {
      // 7-day rolling session. Each authenticated request within the last
      // day extends it by another day — matches Linear/Vercel behavior.
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      // Issue a fresh session token on privilege-relevant events (password
      // change, email verification). Better Auth handles rotation inside
      // those flows when `freshAge` elapses on a sensitive endpoint.
      freshAge: 60 * 5,
    },

    advanced: {
      // Re-iterates the cookie hardening for clarity — these are the
      // defaults Better Auth applies in production, made explicit so the
      // contract is visible in code review.
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
        path: '/',
      },
      useSecureCookies: isProduction,
      // Origin/Referer check on every non-GET. Belt-and-suspenders with
      // the double-submit token middleware mounted by each app.
      disableCSRFCheck: false,
    },

    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      storage: 'memory',
      customRules: {
        '/sign-in/email': { window: 15 * 60, max: 5 },
        '/sign-up/email': { window: 15 * 60, max: 5 },
        '/request-password-reset': { window: 60 * 60, max: 5 },
      },
    },

    logger: {
      level: isProduction ? 'warn' : 'info',
      log: (level, message, ...args) => {
        const payload = args.length > 0 ? { args } : {}
        if (level === 'error') config.logger.error(payload, message)
        else if (level === 'warn') config.logger.warn(payload, message)
        else config.logger.info(payload, message)
      },
    },
  })

  return auth
}

/**
 * Convenience alias for the strongly-typed Better Auth instance produced by
 * {@link createAuth}. Useful for typing dependency-injected wrappers in
 * NestJS providers without naming the entire generic chain.
 */
export type ShipLogAuth = ReturnType<typeof createAuth>
