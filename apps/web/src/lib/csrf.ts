import { randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Cookie carrying the CSRF token. Readable by client-side JS (not HttpOnly)
 * because the client must echo it back in a request header. Signed cookies
 * are unnecessary — the value is random per session and we compare exactly.
 */
export const CSRF_COOKIE_NAME = 'shiplog.csrf'

/**
 * Header the client must send on every state-changing request. Matches the
 * value of {@link CSRF_COOKIE_NAME}.
 */
export const CSRF_HEADER_NAME = 'x-shiplog-csrf'

/** Methods that bypass CSRF — they are intentionally non-mutating. */
export const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Generate a 32-byte URL-safe random token. Use this for both the cookie
 * value and the value the client echoes in the header.
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Constant-time comparison of two CSRF tokens. Length-mismatched inputs
 * are rejected without leaking the expected length.
 */
export function csrfTokensMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}
