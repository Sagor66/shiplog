import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const CSRF_COOKIE_NAME = 'shiplog.csrf';
const CSRF_HEADER_NAME = 'x-shiplog-csrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit CSRF check. Layered on top of Better Auth's Origin/Referer
 * verification because the spec asked for explicit token enforcement.
 *
 * How it works:
 *   1. The Next.js Proxy issues a `shiplog.csrf` cookie on first visit.
 *   2. The web client reads it and echoes the value in the
 *      `X-ShipLog-CSRF` header on every state-changing request.
 *   3. This middleware compares the cookie and header values with a
 *      constant-time check and rejects on mismatch.
 *
 * The cookie is NOT HttpOnly — it MUST be readable by JS so the client
 * can copy it into the header. That's safe: a forged cross-site request
 * cannot read the cookie (SameSite=Lax + Origin header), so it cannot
 * synthesize a matching header. An attacker would need a same-origin
 * XSS to bypass this, which would already game-over the whole session
 * cookie too.
 *
 * Webhook routes (eg. GitHub, Stripe) authenticate by their own signed
 * payload — they should be exempt by mounting them on a path the
 * middleware doesn't cover, or by guarding with `@Public()` and a
 * dedicated webhook signature middleware.
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    if (SAFE_METHODS.has(req.method)) return next();

    const cookieToken = readCookie(req, CSRF_COOKIE_NAME);
    const headerToken = pickHeader(req.headers[CSRF_HEADER_NAME]);

    if (
      !cookieToken ||
      !headerToken ||
      !equalConstantTime(cookieToken, headerToken)
    ) {
      this.logger.warn(
        `csrf.reject method=${req.method} path=${req.originalUrl} ` +
          `cookie_present=${Boolean(cookieToken)} header_present=${Boolean(headerToken)}`,
      );
      res.status(403).json({
        statusCode: 403,
        error: 'ForbiddenCSRF',
        message: 'CSRF token missing or invalid.',
      });
      return;
    }

    next();
  }
}

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function pickHeader(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

function equalConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
