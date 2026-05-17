import { toNextJsHandler } from 'better-auth/next-js'

import { auth } from '@/lib/auth'

/**
 * Catch-all Better Auth route handler. Serves every Better Auth endpoint:
 *
 *   POST /api/auth/sign-up/email
 *   POST /api/auth/sign-in/email
 *   POST /api/auth/sign-out
 *   POST /api/auth/forget-password
 *   POST /api/auth/reset-password
 *   GET  /api/auth/verify-email
 *   POST /api/auth/send-verification-email
 *   GET  /api/auth/sign-in/social/github  (initiates OAuth)
 *   GET  /api/auth/callback/github        (OAuth return URL)
 *   GET  /api/auth/get-session
 *
 * Better Auth handles cookie issuance, Origin verification, rate limiting,
 * and DB persistence. The route handler itself does no work — `auth.handler`
 * is a fully formed `(Request) => Response` function.
 */
export const { GET, POST } = toNextJsHandler(auth.handler)
