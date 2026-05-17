# ShipLog Auth

> Cookie-based authentication shared between `apps/web` (Next.js 16) and
> `apps/api` (NestJS 11), built on Better Auth + Postgres + Prisma.

## TL;DR

- **Next.js owns the auth HTTP handler.** `/api/auth/*` on the web app
  issues cookies, runs OAuth, sends verification email, etc.
- **NestJS only validates.** Both apps import the same `createAuth`
  factory from [`packages/auth`](packages/auth/). They share
  `BETTER_AUTH_SECRET` and `DATABASE_URL`, so the cookie issued by the
  web app validates on the API.
- **Session storage:** Postgres rows in `users`, `accounts`, `sessions`,
  and `verifications`. Cookie value is a crypto-random token that maps to
  one `sessions` row.
- **Cookie:** `HttpOnly` + `SameSite=Lax` + `Secure` (in prod) +
  Origin-header verification + an additional double-submit CSRF token.
- **Passwords:** bcrypt cost 12, validated for length + letter + number.
- **Rate limits:** 5 sign-in attempts / 15 min / IP via Better Auth's
  built-in limiter; `@nestjs/throttler` adds a global 100 req/min cap.

## Repository layout

```
shiplog/
├── apps/
│   ├── web/                          # Next.js 16
│   │   ├── src/proxy.ts              # Next.js Proxy (renamed Middleware in v16)
│   │   ├── src/lib/
│   │   │   ├── auth.ts               # Better Auth instance (server-side)
│   │   │   ├── auth-client.ts        # React client (useSession, signIn…)
│   │   │   ├── get-server-session.ts # Server Component helper
│   │   │   ├── csrf.ts               # Double-submit token helpers
│   │   │   ├── email.ts              # Dev email transport (Pino-logged)
│   │   │   └── logger.ts             # JSON line logger
│   │   ├── src/app/
│   │   │   ├── api/auth/[...all]/route.ts   # Better Auth HTTP handler
│   │   │   ├── api/csrf/route.ts             # GET → returns current csrf token
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   ├── verify-email/page.tsx
│   │   │   └── dashboard/page.tsx            # Protected example
│   │   └── .env.example
│   │
│   └── api/                          # NestJS 11
│       ├── src/auth/                 # See apps/api/src/auth/README.md
│       └── .env.example
│
└── packages/
    ├── auth/                         # Shared Better Auth factory
    │   └── src/
    │       ├── index.ts              # createAuth() — used by both apps
    │       ├── password.ts           # bcrypt-12 + policy validator
    │       ├── client.ts             # createShipLogAuthClient()
    │       └── types.ts              # AuthEmailService, CreateAuthConfig
    │
    └── database/                     # Prisma schema + client
        └── prisma/schema.prisma      # users, accounts, sessions, verifications
```

## Sign-up + email verification flow

```
                ┌──────────────────────────────────────────────┐
                │  User submits /signup form                   │
                │  POST /api/auth/sign-up/email                │
                │     { name, email, password }                │
                └──────────────────────────────────────────────┘
                                  ▼
   1. Better Auth runs password policy (length 8–128).
      Frontend already enforced letter+number; server re-checks length.
   2. bcrypt-12 hash → INSERT INTO accounts (provider_id='credential',
      account_id=email, password=<hash>).
   3. INSERT INTO users (email, name, email_verified=false).
   4. Generate crypto-random token → INSERT INTO verifications
      (identifier=email, value=token, expires_at=now+1h).
   5. Call emailService.sendVerificationEmail({ url, token, ... }).
      Dev impl logs the URL; prod will call Resend.
   6. Return 200 with { user, session: null }.  ←  NO session cookie yet.
                                  ▼
                ┌──────────────────────────────────────────────┐
                │ Frontend shows "Check your email"            │
                └──────────────────────────────────────────────┘
                                  ▼
                ┌──────────────────────────────────────────────┐
                │ User clicks link in email:                    │
                │ GET /api/auth/verify-email?token=…&callbackURL=… │
                └──────────────────────────────────────────────┘
                                  ▼
   7. Lookup verifications WHERE value=token AND expires_at>now.
   8. UPDATE users SET email_verified=true.
   9. DELETE the verifications row (single-use).
  10. Auto sign-in:
       - INSERT INTO sessions (token=random, user_id, expires_at=now+7d).
       - Set-Cookie: better-auth.session_token=<token>; HttpOnly; SameSite=Lax.
  11. 302 → callbackURL (typically /dashboard).
                                  ▼
                ┌──────────────────────────────────────────────┐
                │ Browser hits /dashboard with new cookie       │
                │   Next.js Proxy sees cookie → passes through │
                │   getServerSession() returns user → renders   │
                └──────────────────────────────────────────────┘
```

## Sign-in flow (email + password)

1. POST `/api/auth/sign-in/email` from `/login` page.
2. Better Auth fetches the `credential`-provider `accounts` row by email.
3. bcrypt-12 verify against `accounts.password`.
4. Check `users.email_verified`. If false → `EMAIL_NOT_VERIFIED` (re-send verification mail).
5. INSERT a `sessions` row + Set-Cookie.
6. Rate limited to 5 attempts / 15 min / IP.

## Sign-in flow (GitHub OAuth)

```
1. Click "Continue with GitHub" on /login
   → GET /api/auth/sign-in/social/github
2. Server: generate random state, cookie it (HttpOnly), redirect to GitHub
3. User authorizes → GitHub redirects to:
   /api/auth/callback/github?code=…&state=…
4. Server: state check, exchange code for access token
5. Fetch GitHub user profile → upsert users + accounts
   (provider_id='github', account_id=<github user id>)
6. INSERT sessions + Set-Cookie
7. 302 → /dashboard
```

## How sessions are validated on every request

There are two surfaces. Both ultimately call
`auth.api.getSession({ headers })`, which:

1. Reads the `better-auth.session_token` cookie from `headers.cookie`.
2. `SELECT * FROM sessions WHERE token=? LIMIT 1`.
3. Checks `expires_at > now()`.
4. If the session is within `updateAge` of expiring (1 day), rolls
   `expires_at` forward and updates the cookie.
5. `SELECT * FROM users WHERE id = session.user_id`.
6. Returns `{ user, session }` or `null`.

### On the Next.js side

- **Proxy** (`apps/web/src/proxy.ts`) does an **optimistic** check —
  redirects to `/login` if the session cookie is *visibly* absent. It
  cannot reach Postgres safely, so the real check happens in the page.
- **Server Components** call `getServerSession()`, which calls
  `auth.api.getSession({ headers: await headers() })`. This is the
  authoritative check.
- **Client Components** use `useSession()` from
  `apps/web/src/lib/auth-client.ts` — a reactive store backed by
  `GET /api/auth/get-session`.

### On the NestJS side

- **`AuthGuard`** is registered globally. Every route is closed by
  default. It calls `AuthService.validateRequest(req.headers)`, which
  delegates to `auth.api.getSession`. Result is attached to
  `req.user` / `req.session`.
- **`@CurrentUser()`** injects the validated user into a handler param.
- **`@Public()`** opts a route out of the guard (still subject to CSRF +
  throttling unless explicitly excluded).

## What this setup defends against

| Attack                                | Defense                                                                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cookie theft via XSS**              | `HttpOnly` cookie — not readable from JS. Even if XSS lands, the attacker can't exfiltrate the session token via `document.cookie`.                                       |
| **CSRF (cross-site POST)**            | (a) `SameSite=Lax` blocks the cookie on cross-site form posts. (b) Better Auth verifies the `Origin` header matches `BETTER_AUTH_URL`. (c) Double-submit token middleware. |
| **Cookie tampering**                  | Session tokens are 32 bytes of `crypto.randomBytes`. They aren't signed — they're random and looked up in `sessions`. Tampering = invalid lookup = 401.                   |
| **Session fixation**                  | Sign-in always issues a **new** session token; old token isn't reused. Password reset rotates the token, invalidating all old logged-in sessions.                         |
| **Brute-force passwords**             | Bcrypt cost 12 (~250ms/attempt) + rate limit of 5 sign-ins / 15 min / IP. Stops both online guessing and credential-stuffing at scale.                                    |
| **User enumeration**                  | Login error messages are identical for "no such user" and "wrong password." Forgot-password always reports success regardless of whether the email exists.                |
| **Insecure password storage**         | Never plaintext. Bcrypt with per-row salt + work factor 12.                                                                                                              |
| **Replay of old verification tokens** | `verifications` rows expire in 1h and are deleted on use — they can't be re-redeemed.                                                                                    |
| **Weak passwords**                    | Min 8 chars + letter + number, enforced client-side (UX) and server-side (Better Auth length check + our policy validator on Server Actions if added).                    |
| **Session hijacking via MITM**        | `Secure` flag in production blocks cookies on plain HTTP. `SameSite=Lax` adds belt-and-suspenders.                                                                       |
| **OAuth state spoofing**              | Better Auth generates a random `state` per OAuth init, cookies it, and verifies on callback.                                                                              |
| **Stale sessions after password change** | Password reset endpoint rotates the session — old `sessions` rows for that user are invalidated.                                                                       |
| **Long-lived sessions**               | 7-day TTL with 1-day rolling update. Idle sessions expire automatically.                                                                                                  |
| **Account takeover via email change** | (Not implemented yet.) Better Auth's `changeEmail` flow requires verifying the new address with a token before it sticks — wire this up before enabling.                  |

## What this setup does NOT defend against (and why)

- **Same-origin XSS.** If you ship `<script>` injection on a page that the
  browser trusts, the attacker can call `/api/auth/*` as the user. The
  fix is CSP — that lives in `proxy.ts` and `next.config.ts`, not here.
- **Compromised host.** If `DATABASE_URL` or `BETTER_AUTH_SECRET` leaks,
  all bets are off. Rotate `BETTER_AUTH_SECRET` regularly in prod; that
  invalidates every existing cookie.
- **Phishing.** Better Auth can't tell a legitimate user from a phished
  one. Future hardening: WebAuthn or TOTP via Better Auth plugin.

## Operational notes

- **Rotating the secret:** changing `BETTER_AUTH_SECRET` does not
  invalidate existing `sessions` rows (the secret is for OAuth state +
  signed cookies that we don't use). To force re-login for everyone,
  `TRUNCATE sessions;`.
- **Email delivery:** dev impls log to Pino. To go live, swap
  `apps/web/src/lib/email.ts` and `apps/api/src/auth/email/api-email.service.ts`
  for a Resend-backed implementation behind the same `AuthEmailService`
  interface.
- **Adding fields to `users`:** add to `schema.prisma`, then list the
  new field in `user.additionalFields` of the Better Auth config in
  `packages/auth/src/index.ts`.
