import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { CSRF_COOKIE_NAME, generateCsrfToken } from '@/lib/csrf'

/**
 * Next.js 16 Proxy (formerly Middleware). Two responsibilities:
 *
 *   1. **Optimistic auth gate on /dashboard/*** — bail to /login when no
 *      session cookie is present. This is an Origin-side hint only; the
 *      route itself still calls `getServerSession()` to validate. The Next.js
 *      docs explicitly say Proxy must NOT be the sole gate for sensitive
 *      data (it runs in the edge runtime and can't reach Postgres safely).
 *
 *   2. **Ensure the CSRF cookie exists.** Issued lazily for every request
 *      that hits an HTML route or the API. The token is consumed by the
 *      double-submit check in NestJS and on Server Actions that hit
 *      `/api/*` endpoints.
 *
 * The matcher excludes Next.js internals and static assets so we don't
 * burn time on every image fetch.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // CSRF cookie issuance — readable to JS (the client must echo it in a
  // header) but with sameSite=lax so it isn't sent on cross-site requests.
  if (!request.cookies.has(CSRF_COOKIE_NAME)) {
    response.cookies.set(CSRF_COOKIE_NAME, generateCsrfToken(), {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
  }

  // Optimistic redirect for /dashboard when there is clearly no session.
  // Better Auth's session cookie is named `better-auth.session_token` (dev)
  // or `__Secure-better-auth.session_token` (production). We only redirect
  // when neither is present — the page itself does the authoritative check.
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
  if (isDashboard) {
    const hasSession =
      request.cookies.has('better-auth.session_token') ||
      request.cookies.has('__Secure-better-auth.session_token')
    if (!hasSession) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Run on everything except Next internals and static files. Auth pages
     * (login/signup) still need to pass through so we can set the CSRF
     * cookie on first visit.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)',
  ],
}
