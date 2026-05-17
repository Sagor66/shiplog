# Recruiter / Interviewer Q&A — ShipLog Auth

> Prep doc for questions about the auth implementation. Grouped by likely line of questioning. Each answer is what you can say in your own voice. The "If they push" lines are the follow-ups they'll likely throw at you.

---

## 1. High-level architecture

**Q: Walk me through the auth architecture.**
> Cookie-based session auth using Better Auth, sharing a single Postgres database. Next.js owns the auth HTTP endpoints — `/api/auth/[...all]` handles sign-up, sign-in, email verification, OAuth callback, password reset. NestJS is a pure resource API: it never issues cookies, only reads them. A shared `packages/auth` package exports a `createAuth()` factory that both apps instantiate with the same secret and DB, so a cookie issued by Next validates on Nest.

**Q: Why did you put the auth handler on Next.js instead of NestJS?**
> Three reasons. First, same-origin cookies: the browser sees one host for the page and the auth endpoints, so `SameSite=Lax` cookies work without any CORS or `credentials: include` plumbing. Second, GitHub OAuth needs one redirect URL — landing it on the web app means no extra hop. Third, Better Auth's React client is built for same-origin by default. The cost is that NestJS doesn't "own" auth, but it doesn't need to — it just validates a session cookie, which is what a resource API should do anyway. This is the same shape Vercel and Linear use.

**Q: Could you have run Better Auth in both apps?**
> Could, but I deliberately didn't. Two identical configs would have to stay byte-perfect — cookie name, secret, plugins. One drift and you have a silent auth bug. With the shared `createAuth` factory there's exactly one source of truth.

**If they push: "what if you wanted a mobile client?"** Better Auth supports bearer tokens via a plugin. You'd mount the handler on NestJS *additionally* for `/v1/auth/*` and keep the cookie flow for the web. No rework of the cookie path.

---

## 2. Session validation

**Q: How does a request get validated on every hit to NestJS?**
> Globally registered `AuthGuard`. It reads the request headers, converts them to a Web `Headers` object via Better Auth's `fromNodeHeaders` helper, then calls `auth.api.getSession({ headers })`. Internally that does a `SELECT * FROM sessions WHERE token = ?`, checks `expires_at > now()`, joins to `users`. If the session's missing or expired, throws `UnauthorizedError` (401). If valid but `email_verified = false`, throws `EmailNotVerifiedError` (403). Otherwise attaches `req.user` and `req.session`.

**Q: Why a global guard instead of opt-in per route?**
> Defaulting to closed is safer than defaulting to open. A new endpoint that forgets `@UseGuards` is the kind of bug that ships to production unnoticed. Anything that needs to be public — health check, webhook — uses an explicit `@Public()` decorator.

**Q: How do you skip auth for a public endpoint?**
> `@Public()` decorator sets a metadata key. The guard reads it via Nest's `Reflector` and returns true early. Throttling and CSRF still apply.

**Q: How does the Next.js side check sessions?**
> Three places. In Server Components, `getServerSession()` calls the same `auth.api.getSession`. In Client Components, the Better Auth React client's `useSession()` hook fetches `/api/auth/get-session`. And the Next.js Proxy (the renamed Middleware in Next 16) does an optimistic cookie-presence check on `/dashboard/*` to redirect unauthenticated users before the page even renders. The Proxy is just a hint — the page itself does the authoritative check via `getServerSession`.

**Q: Why isn't the Proxy the only check?**
> Next.js's docs explicitly warn against it. Proxy runs in the edge runtime, has no reliable DB access, and is supposed to be fast. Real validation needs to hit Postgres. Proxy is for UX — bouncing the user to `/login` before showing them a flash of empty page.

---

## 3. Cookies & sessions

**Q: What are the cookie attributes and why?**
> `HttpOnly` — JS can't read it, so XSS can't exfiltrate the token. `SameSite=Lax` — not sent on cross-site form posts. `Secure` (production only) — only over HTTPS. `Path=/` — sent on every request. Issued by Better Auth via `defaultCookieAttributes`.

**Q: How is the session token generated?**
> 32 bytes of `crypto.randomBytes`, base64-encoded. Not signed — there's no point. We aren't carrying any payload in the cookie; the cookie value is just a lookup key into the `sessions` table. Tampering = lookup miss = 401.

**Q: What's the session lifetime?**
> 7-day TTL with a 1-day rolling update. Every authenticated request within the last day of the window extends it. Idle sessions expire automatically. That's Linear/Vercel behavior.

**Q: What happens to existing sessions when a user changes their password?**
> Better Auth's password reset rotates the session — the old `sessions` row is invalidated. So if an attacker had a stolen cookie and the real user resets their password, the attacker is logged out.

---

## 4. CSRF

**Q: How are you defending against CSRF?**
> Three layers. First, `SameSite=Lax` on the session cookie — the browser won't send it on cross-site `POST`. Second, Better Auth verifies the `Origin` header matches `BETTER_AUTH_URL` on every non-GET. Third, a double-submit CSRF token: a non-HttpOnly `shiplog.csrf` cookie set by the Next.js Proxy, echoed in an `X-ShipLog-CSRF` header by the client, compared constant-time on the API.

**Q: Why all three? Isn't `SameSite=Lax` enough?**
> It's almost enough — `SameSite=Lax` + Origin check is what Vercel and Linear use. The spec asked for explicit CSRF tokens so I layered them on top. The marginal benefit is defense against browser bugs and edge cases where `SameSite` behavior gets weird (older Safari, some embedded webviews).

**Q: Why is the CSRF cookie not HttpOnly?**
> It has to be readable by JS so the client can copy it into a request header — that's the whole "double-submit" pattern. It's safe because an attacker on another origin can't *read* the cookie (SameSite blocks it on cross-site fetches), so they can't synthesize a matching header. An XSS on our own origin defeats this — but it also defeats the session cookie, so we're not making things worse.

**Q: Constant-time compare — why?**
> Timing-attack resistance. A naive `===` would short-circuit on the first mismatched byte; a sufficiently patient attacker could measure response times and learn the token byte-by-byte. `crypto.timingSafeEqual` always takes the same time.

---

## 5. Passwords

**Q: How are passwords stored?**
> bcrypt with cost factor 12. Better Auth's default is scrypt — I overrode it via the `password.hash` / `password.verify` hooks because the spec asked for bcrypt-12.

**Q: Why cost 12?**
> ~250ms per hash on modern hardware. Slow enough that brute-forcing is expensive (millions of dollars to crack one good password), fast enough that real users don't notice. OWASP recommends ≥10; we're two above.

**Q: What's the password policy?**
> 8–128 chars, must contain a letter and a number. Enforced client-side for UX (instant feedback) and server-side at the API boundary. Server is the authority — client is only a hint.

**Q: Why also enforce client-side if the server checks?**
> So the user doesn't have to wait for a round-trip to learn their password is too short. Server check is the actual security boundary.

---

## 6. Email verification

**Q: Walk me through the verification flow.**
> User submits sign-up. Better Auth bcrypts the password, inserts into `users` with `email_verified=false` and into `accounts`. Generates a crypto-random token, inserts a `verifications` row with `expires_at = now() + 1h`, calls our `emailService.sendVerificationEmail`. Returns 200 with `session: null` — *no cookie yet*. User clicks the email link → `GET /api/auth/verify-email?token=…`. We look up by token, check expiry, set `email_verified=true`, *delete* the verifications row (single-use), then auto-sign-in by inserting a fresh `sessions` row and setting the cookie. 302 to `/dashboard`.

**Q: What stops someone replaying an old verification token?**
> Two things. `expires_at` is 1 hour. And the row is deleted on successful redemption — once used it's gone, can't be replayed.

**Q: How are emails actually sent?**
> Through a pluggable `AuthEmailService` interface. In dev, the implementation logs the URL via Pino so I can click the link from the terminal. In production we'd swap in a Resend-backed implementation behind the same interface — the auth code doesn't change. Resend is already installed; just no API key wired yet.

**Q: Why didn't you just wire Resend now?**
> Decision in the planning phase: don't block local dev on having a verified sender domain. The interface lets us swap transports without touching auth logic.

---

## 7. Rate limiting

**Q: What rate limits are in place?**
> Two layers. Better Auth's built-in limiter has custom rules: 5 sign-in attempts / 15 min / IP, same for sign-up, and 5 password-reset requests / hour / IP. On top of that, NestJS has `@nestjs/throttler` configured globally at 100 req/min/IP. That second layer catches everything, not just auth endpoints.

**Q: What storage does the rate limiter use?**
> Memory. That's a single-instance limitation. In production behind a load balancer we'd swap to Redis (Better Auth has a `secondary-storage` option for this).

**Q: What stops credential stuffing?**
> The 5/15min cap. Even if an attacker has 10,000 leaked email/password pairs, they can only try 5 against ShipLog per 15 minutes per IP. Distributed across botnets they get more, but bcrypt-12 means each attempt is ~250ms — the math gets expensive fast.

---

## 8. Error messaging

**Q: Login fails — what does the user see?**
> "Invalid email or password." Always. Never "no such user" vs. "wrong password." That distinction is what enables user enumeration — an attacker can probe whether a given email is registered.

**Q: What about "forgot password"?**
> Always responds success, even if the email doesn't exist. Same reason — leaking which addresses are registered helps phishing campaigns and credential stuffing.

**Q: But what if the user's email isn't verified?**
> That one we do surface explicitly: "Your email is not verified." Hiding it would trap the user in a loop where login silently fails and they don't know why. Worth the small enumeration risk.

---

## 9. Database schema

**Q: How is auth state stored?**
> Four Prisma models: `User`, `Account` (one row per identity — credential, GitHub, etc.), `Session`, and `Verification` for short-lived tokens. All UUID primary keys, `snake_case` columns via Prisma's `@map`, `TIMESTAMPTZ(6)` for timestamps.

**Q: Why a separate `Account` table from `User`?**
> A user can have multiple identities — email/password *and* GitHub OAuth, for instance. The user row is the identity; account rows are the credentials/providers attached to it. Standard pattern, same as NextAuth/Better Auth's default.

**Q: How did you handle the migration from the existing schema?**
> The existing schema had `password_hash` instead of `password` and was missing OAuth fields like `id_token`, `access_token_expires_at`, `scope`. I renamed the Prisma field from `passwordHash` → `password` while keeping `@map("password_hash")` so the DB column didn't move, and added the missing OAuth columns. Then added a new `Verification` model. One migration: `20260516160040_better_auth_compat`.

**Q: Why not just rename the column?**
> The column name is a database-level concern; the Prisma field is the application-level name. By using `@map`, the database stays stable across schema renames. If any external tool (analytics, backup script) was reading `password_hash`, it still works.

---

## 10. Monorepo / code organization

**Q: Why a separate `packages/auth`?**
> Both apps need to instantiate Better Auth with the *exact same* config. If I duplicated the config in each app, they'd inevitably drift — someone adds a plugin in one place, forgets the other, sessions stop validating. The package exports a `createAuth(config)` factory. Each app calls it with its own logger and email service, but the auth behavior is identical.

**Q: Why is the password policy in the shared package and not the web app?**
> So the server-side endpoint (which lives in Next.js but could theoretically be called from anywhere) and the client-side form both use the same regex. Same goes for the bcrypt hash/verify functions — they're tied to the auth config, not to a specific app.

**Q: How are the apps wired together at runtime?**
> pnpm workspaces. `@shiplog/auth` and `@shiplog/database` are workspace packages. The apps import them as if they were normal npm packages; pnpm symlinks them into `node_modules` at install time. TypeScript points `main` and `types` at the source `.ts` files, so there's no build step for the shared packages.

---

## 11. The Next.js 16 thing

**Q: I noticed `proxy.ts` instead of `middleware.ts` — what's that?**
> Next.js 16 renamed Middleware to Proxy. Same functionality, different file name and conceptual framing. The docs explicitly say "Starting with Next.js 16, Middleware is now called Proxy to better reflect its purpose." I checked the version-specific docs in `node_modules/next/dist/docs/` before writing it.

**Q: Why did you check the local docs?**
> The web app has a `CLAUDE.md` warning that "this is NOT the Next.js you know" — there are breaking changes from training data. Default behavior in this codebase is to consult `node_modules/next/dist/docs/` before writing Next-specific code.

---

## 12. Tradeoffs & "what would you do differently"

**Q: What's the weakest link in this setup?**
> Two things. (1) Rate limit storage is in-memory, so it doesn't survive a restart and doesn't share state across instances. Production needs Redis-backed storage. (2) No WebAuthn or TOTP yet — passwords + email are the only factors, which is fine for an early product but I'd add 2FA via a Better Auth plugin before going enterprise.

**Q: What about CSP?**
> Out of scope for this task but I'd add it next. CSP lives in Next.js config and the Proxy, not in the auth module. The auth model assumes XSS is prevented by *something* — CSP is that something.

**Q: How would you test this?**
> Three layers. Unit tests on `validatePasswordPolicy` and the CSRF compare. Integration tests on the AuthGuard with a mocked Better Auth instance. End-to-end Playwright tests for the actual sign-up → email verification → dashboard flow, using a real Postgres and a stubbed mailer that captures the verification URL.

**Q: What's left before this is production-ready?**
> Replace in-memory rate limit with Redis. Wire Resend (or another provider) for real email. Add CSP. Consider adding a 2FA plugin. Move secrets from `.env` files to a proper secret manager (1Password CLI, AWS Secrets Manager, Doppler). Add monitoring on auth events — failed logins, lockouts, OAuth failures.

---

## 13. Curveballs

**Q: What if someone steals a session cookie?**
> Until the session expires (7 days max), they have access. Mitigations: short TTL with rolling refresh, IP/UA tracking on the `sessions` row (we capture both), and revocation via password reset which rotates the session. Long-term hardening would be device fingerprinting and anomaly detection — out of scope here.

**Q: How does GitHub OAuth state protection work?**
> Better Auth generates a random `state` parameter on the initial redirect, cookies it (HttpOnly), and verifies it on the callback. Without that the callback URL could be hit with a forged code from a different OAuth session and bind the attacker's GitHub identity to the victim's account. State binding prevents this.

**Q: What's `fromNodeHeaders` doing in `auth.service.ts`?**
> NestJS runs on Express, which uses Node's `IncomingHttpHeaders` shape (a plain dict of strings/arrays). Better Auth's API is built on the Web platform's `Headers` class. `fromNodeHeaders` is the bridge — it copies the Node-shaped headers into a Web `Headers` object so `auth.api.getSession({ headers })` works regardless of which side called it. Same code path runs in Next.js (where headers are already Web-shaped from the start).

**Q: Could you swap Better Auth out?**
> Yes, with effort proportional to scope. The `AuthService` wraps `auth.api.getSession` specifically so the rest of the code never touches Better Auth directly. The guard, decorators, and controllers depend on the service, not the library. To swap to, say, Lucia or a hand-rolled session table, I'd reimplement `AuthService.validateRequest` and the `packages/auth/createAuth` factory. The rest is portable.

**Q: Why bcrypt and not Argon2?**
> Argon2 is technically stronger (memory-hard, resistant to GPU/ASIC attacks). I went bcrypt because: (a) the spec said bcrypt-12, (b) bcrypt has 25 years of production hardening, (c) Argon2's tuning parameters are easier to misconfigure. If the spec said Argon2 I'd have used it via `argon2.hash` in the same `password.hash` hook.

**Q: Where are the secrets stored right now?**
> Two `.env` files (`apps/api/.env`, `apps/web/.env.local`) — gitignored. In production they'd come from the platform's secret manager. The `BETTER_AUTH_SECRET` is the most critical one; rotating it doesn't invalidate sessions (the secret is for OAuth state binding, not cookie signing), but anyone with it can forge OAuth callbacks for our app, so it's treated as a credential.

---

## 14. If they ask "explain this code"

Three files worth being able to point at:

- **[apps/api/src/auth/guards/auth.guard.ts](apps/api/src/auth/guards/auth.guard.ts)** — the single chokepoint that decides "let this request through or not." Reads the cookie, calls `AuthService.validateRequest`, attaches `req.user` or throws.

- **[packages/auth/src/index.ts](packages/auth/src/index.ts)** — the shared Better Auth config. One place that defines every auth behavior the app has: password rules, session TTL, OAuth providers, rate limits, cookie attributes, email hooks.

- **[apps/web/src/proxy.ts](apps/web/src/proxy.ts)** — the edge-runtime layer that issues the CSRF cookie and does optimistic `/dashboard` redirects. Not the authoritative gate; that lives in the Server Component.

If they want the broadest single-file overview, **[AUTH.md](AUTH.md)** at the repo root has the full system view with diagrams of every flow and the attack/defense table.

---

## One thing not to bluff

If they ask something you don't remember the answer to, say "I'd have to check the file — I built it on this specific stack but the exact config flag escapes me right now." That's a perfectly normal engineer answer. Bluffing on a wrong constant ("session is 30 days") when the truth is "7 days" reads worse than admitting you'd grep for it.
