import bcrypt from 'bcrypt'

/**
 * Bcrypt work factor for password hashing. Cost 12 = ~250ms per hash on
 * modern hardware — slow enough to be expensive to brute-force, fast enough
 * to be invisible to legitimate users. Do not lower this.
 */
const BCRYPT_COST = 12

/**
 * Hash a plaintext password with bcrypt at the project-wide cost factor.
 * Wired into Better Auth via `emailAndPassword.password.hash`.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST)
}

/**
 * Constant-time verification of a plaintext password against a stored
 * bcrypt hash. Wired into Better Auth via `emailAndPassword.password.verify`.
 */
export async function verifyPassword(input: {
  hash: string
  password: string
}): Promise<boolean> {
  return bcrypt.compare(input.password, input.hash)
}

/**
 * Enforce the documented password policy: 8+ chars, at least one letter,
 * at least one number. Called from the sign-up form before submitting to
 * Better Auth. Better Auth itself only enforces length.
 *
 * Returns `null` on success, or a user-safe error message on failure.
 * The message is intentionally generic — it should not reveal *which*
 * rule was violated in a way that helps password-spraying attackers.
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
