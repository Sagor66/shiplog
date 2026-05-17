/**
 * Browser-safe password policy. No bcrypt, no Node built-ins — this module
 * is intentionally a pure-function island so the sign-up and reset-password
 * client components can import it without dragging native bindings into the
 * browser bundle.
 *
 * Exposed via the `@shiplog/auth/policy` subpath export.
 */

/**
 * Enforce the documented password policy: 8+ chars, at least one letter,
 * at least one number. Returns `null` on success, or a user-safe error
 * message on failure.
 *
 * The message is intentionally generic — it does not reveal *which* rule
 * was violated in a way that would help password-spraying attackers
 * narrow their guesses.
 */
export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (password.length > 128) return 'Password is too long.'
  if (!/[a-zA-Z]/.test(password)) {
    return 'Password must include a letter and a number.'
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include a letter and a number.'
  }
  return null
}
