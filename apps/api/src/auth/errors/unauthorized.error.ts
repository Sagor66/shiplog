import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Generic auth failure. Thrown when a request has no session cookie, the
 * session is expired, or the cookie has been tampered with.
 *
 * The HTTP response body is intentionally terse — we never reveal
 * *which* failure occurred. Verbose error messages help attackers
 * distinguish "valid session but wrong scope" from "no session at all,"
 * which feeds enumeration attacks. The reason field is for our own
 * structured logs, not the wire.
 */
export class UnauthorizedError extends HttpException {
  constructor(reason: string) {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        error: 'Unauthorized',
        message: 'Authentication required.',
      },
      HttpStatus.UNAUTHORIZED,
    );
    this.reason = reason;
  }

  /** Internal label written to logs. NEVER surfaced to the client. */
  readonly reason: string;
}
