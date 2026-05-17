import { Injectable, Logger } from '@nestjs/common';

import type { AuthEmailService } from '@shiplog/auth';

/**
 * Email transport used when Better Auth runs inside the NestJS process.
 *
 * In practice NestJS never triggers email sends because the HTTP auth
 * endpoints live on the Next.js side — but the Better Auth config still
 * requires a non-null `emailService`, and there's a future world where
 * we expose a CLI/admin route that triggers verification. The dev impl
 * logs via Nest's logger so any send attempt is visible.
 *
 * Swap this out for a Resend-backed implementation behind the same
 * interface to go to production.
 */
@Injectable()
export class ApiEmailService implements AuthEmailService {
  private readonly logger = new Logger(ApiEmailService.name);

  async sendVerificationEmail(input: {
    to: string;
    name: string | null;
    url: string;
    token: string;
    expiresInSeconds: number;
  }): Promise<void> {
    this.logger.log(
      JSON.stringify({
        event: 'auth.email.verification',
        to: input.to,
        url: input.url,
        token_preview: `${input.token.slice(0, 6)}…`,
        expires_in_seconds: input.expiresInSeconds,
        msg: 'Sending verification email (dev: logged, not delivered)',
      }),
    );
  }

  async sendPasswordResetEmail(input: {
    to: string;
    name: string | null;
    url: string;
    token: string;
    expiresInSeconds: number;
  }): Promise<void> {
    this.logger.log(
      JSON.stringify({
        event: 'auth.email.password_reset',
        to: input.to,
        url: input.url,
        token_preview: `${input.token.slice(0, 6)}…`,
        expires_in_seconds: input.expiresInSeconds,
        msg: 'Sending password-reset email (dev: logged, not delivered)',
      }),
    );
  }
}
