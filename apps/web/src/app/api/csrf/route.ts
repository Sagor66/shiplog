import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { CSRF_COOKIE_NAME, generateCsrfToken } from '@/lib/csrf'

/**
 * Return the current CSRF token, minting one if the cookie is missing.
 * Clients fetch this once on mount, then echo the value in the
 * `X-ShipLog-CSRF` header on every state-changing request. The NestJS API
 * (and any Server Action that wants to enforce CSRF) compares the cookie
 * and header values; mismatch = 403.
 *
 * The cookie itself is set by the Next.js Proxy on the first request, so
 * this endpoint will normally just read it.
 */
export async function GET() {
  const store = await cookies()
  let token = store.get(CSRF_COOKIE_NAME)?.value
  if (!token) {
    token = generateCsrfToken()
    store.set(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
  }
  return NextResponse.json({ csrfToken: token })
}
