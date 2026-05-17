import type { AuthEmailService, AuthLogger } from '@shiplog/auth'

/**
 * Dev-mode email transport. Prints the verification/reset URL via the
 * provided logger so a developer can copy it from the terminal.
 *
 * In production, swap for a Resend-backed implementation behind the same
 * `AuthEmailService` interface — the Better Auth config does not need to
 * change.
 */
export function createDevEmailService(logger: AuthLogger): AuthEmailService {
  return {
    async sendVerificationEmail({ to, name, url, token, expiresInSeconds }) {
      logger.info(
        {
          event: 'auth.email.verification',
          to,
          name,
          url,
          // We deliberately do NOT log the raw token at info level —
          // anyone with terminal access could redeem it. The full URL
          // (which is what the user clicks) carries the token already.
          token_preview: `${token.slice(0, 6)}…`,
          expires_in_seconds: expiresInSeconds,
        },
        'Sending verification email (dev: logged, not delivered)',
      )
    },
    async sendPasswordResetEmail({ to, name, url, token, expiresInSeconds }) {
      logger.info(
        {
          event: 'auth.email.password_reset',
          to,
          name,
          url,
          token_preview: `${token.slice(0, 6)}…`,
          expires_in_seconds: expiresInSeconds,
        },
        'Sending password-reset email (dev: logged, not delivered)',
      )
    },
  }
}
