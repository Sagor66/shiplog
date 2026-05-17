import { createAuthClient } from 'better-auth/client'

/**
 * Build a Better Auth React client bound to a given base URL.
 *
 * Default to same-origin (`baseURL` omitted) when running under Next.js
 * route handlers — the client will issue requests like
 * `fetch('/api/auth/sign-in/email')` and the cookie round-trips naturally.
 *
 * For non-browser callers (eg. a future mobile client), pass an absolute
 * `baseURL` and set `fetchOptions.credentials = 'include'`.
 */
export function createShipLogAuthClient(config?: { baseURL?: string }) {
  return createAuthClient({
    baseURL: config?.baseURL,
  })
}

export type ShipLogAuthClient = ReturnType<typeof createShipLogAuthClient>
