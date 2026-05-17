import { createAuth } from '@shiplog/auth'

import { createDevEmailService } from './email'
import { webLogger } from './logger'

const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
const secret = process.env.BETTER_AUTH_SECRET
if (!secret) {
  throw new Error(
    '[auth] BETTER_AUTH_SECRET is required. Generate one with `openssl rand -base64 32` and add it to apps/api/.env.',
  )
}

const githubClientId = process.env.GITHUB_CLIENT_ID
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET
const github =
  githubClientId && githubClientSecret
    ? { clientId: githubClientId, clientSecret: githubClientSecret }
    : undefined

/**
 * Singleton Better Auth instance for the web app. Owns:
 *   - the HTTP handler mounted at /api/auth/[...all]
 *   - the cookie issued to the browser
 *   - email-verification and password-reset email sends
 *
 * The NestJS API imports the same `createAuth` factory with the same
 * `BETTER_AUTH_SECRET` so it can validate the cookie out-of-band.
 */
export const auth = createAuth({
  baseURL,
  secret,
  isProduction: process.env.NODE_ENV === 'production',
  github,
  logger: webLogger,
  emailService: createDevEmailService(webLogger),
})

/**
 * Convenience: `auth.api.getSession({ headers })` shape, narrowed for use
 * in server components. Returns `null` when no cookie or an expired one.
 */
export type AuthSession = Awaited<
  ReturnType<typeof auth.api.getSession>
>
