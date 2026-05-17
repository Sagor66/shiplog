# `apps/api/src/auth/` — ShipLog Auth Module

> Cookie-validating NestJS auth module backed by Better Auth.

## What this module does

This module **does not host the login flow.** Sign-up, sign-in, email
verification, password reset, and GitHub OAuth all live on the **Next.js app**
under `/api/auth/[...all]`. The NestJS API's only job is to read the cookie
those endpoints issue, look up the matching `sessions` row, and decide whether
to let a request through.

```
                ┌──────────────────────────┐
                │ apps/web (Next.js 16)    │
   browser ──▶  │   /login, /signup, etc.  │
                │   /api/auth/[...all]     │  ← Better Auth HTTP handler
                │      issues cookie       │
                └──────────────┬───────────┘
                               │   cookie
                               ▼
                ┌──────────────────────────┐
                │ apps/api (NestJS)        │
                │   AuthGuard               │ ─▶ auth.api.getSession(headers)
                │   @CurrentUser()          │
                │   /auth/me                │
                └──────────────────────────┘
                               │
                               ▼
                  Postgres (shared User/Session/Account/Verification)
```

Both apps import [`@shiplog/auth`](../../../../packages/auth/) which exports
the `createAuth` factory. They construct the auth instance with the **same**
`BETTER_AUTH_SECRET` and `DATABASE_URL`, so the cookie issued by Next.js
validates cleanly here.

## Layout

```
auth/
├── auth.module.ts            Wires guard + middleware + DI
├── auth.controller.ts        GET /auth/me
├── auth.service.ts           Wraps auth.api.getSession
├── auth.tokens.ts            DI token for the Better Auth instance
├── csrf.middleware.ts        Double-submit CSRF check
├── decorators/
│   ├── current-user.decorator.ts   @CurrentUser() injects SessionUser
│   └── public.decorator.ts         @Public() opts route out of AuthGuard
├── email/
│   └── api-email.service.ts  Pino-logged email transport (dev)
├── errors/
│   ├── unauthorized.error.ts        401 — generic, no detail leak
│   └── email-not-verified.error.ts  403 — verification-required state
├── guards/
│   └── auth.guard.ts         Global guard; validates session per request
├── dto/
│   └── me-response.dto.ts
└── types.ts                  SessionUser, SessionMeta, AuthenticatedRequest
```

## Defense-in-depth layers (apply in this order on every request)

| Layer                       | Check                                         | Mechanism                                |
| --------------------------- | --------------------------------------------- | ---------------------------------------- |
| 1. Rate limit (global)      | 100 req/min/IP                                | `@nestjs/throttler` `ThrottlerGuard`     |
| 2. Rate limit (auth-paths)  | 5 sign-ins/15 min/IP, etc.                    | Better Auth `customRules` (on Next side) |
| 3. CSRF                     | Cookie value === header value                 | `CsrfMiddleware` (this module)           |
| 4. Origin verification      | `Origin` header matches `BETTER_AUTH_URL`     | Built into Better Auth                   |
| 5. Session validation       | Cookie → `sessions` row, not expired          | `AuthGuard` → `AuthService`              |
| 6. Email verification       | `users.email_verified = true`                 | `AuthGuard`                              |

## Usage

### Default — every route requires a verified session

`AuthGuard` is registered globally in `auth.module.ts`. A controller method
with no decorators is closed by default.

```ts
@Controller('workspaces')
export class WorkspacesController {
  @Get(':id')
  show(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    // user is guaranteed non-null, email-verified, and the request is CSRF-checked
  }
}
```

### Explicitly public

Webhook receivers, health checks, and public read endpoints opt out with
`@Public()`. They still go through CSRF + rate limiting unless explicitly
excluded in `auth.module.ts`.

```ts
@Public()
@Get('healthz')
health() { return { ok: true } }
```

### Inject the user

```ts
import { CurrentUser } from './auth/decorators/current-user.decorator.js'
import type { SessionUser } from './auth/types.js'

@Get('me')
me(@CurrentUser() user: SessionUser) {
  return user
}
```

### Read session metadata

```ts
@Get('whoami')
whoami(@Req() req: AuthenticatedRequest) {
  return { userId: req.user.id, expiresAt: req.session.expiresAt }
}
```

## Adding a new auth-aware feature

1. **Need the user?** Use `@CurrentUser()`. Don't read the cookie directly.
2. **Need finer permissions?** Compose this guard with role/workspace
   guards that run after `AuthGuard` in the same handler.
3. **Hosting a webhook?** Use `@Public()` AND mount it under a path that
   the CSRF middleware skips (`auth.module.ts:configure`), AND verify
   the webhook signature in the controller.

## Error responses

| Condition                          | Status | Body                            |
| ---------------------------------- | ------ | ------------------------------- |
| No or expired session              | 401    | `{ error: "Unauthorized" }`     |
| Valid session, email not verified  | 403    | `{ error: "EmailNotVerified" }` |
| CSRF token missing/mismatched      | 403    | `{ error: "ForbiddenCSRF" }`    |
| Rate limit exceeded                | 429    | `{ error: "ThrottlerException"}`|

Error messages are intentionally vague — they tell the client what to do
but never *why* the server said no. The internal `reason` field on
`UnauthorizedError` is for our logs, not the wire.

## Configuration

All wiring lives in `auth.module.ts`. Env vars are read via
`ConfigService` — see [`apps/api/.env.example`](../../.env.example) for
the full list. The required ones for this module:

- `BETTER_AUTH_SECRET` — must match `apps/web/.env`
- `BETTER_AUTH_URL` — the **web** app's public origin
- `DATABASE_URL` — shared with the web app
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — optional; absent ⇒ GitHub sign-in disabled

## Why not run Better Auth's HTTP handler on NestJS too?

Discussed in detail in the top-level
[`AUTH.md`](../../../../AUTH.md). Short version: same-origin cookies are
easier and safer than cross-origin cookies, and the OAuth callback URL
needs to land somewhere — landing on the web app means one fewer redirect
hop. NestJS staying as a pure resource API keeps the deployment topology
simple.
