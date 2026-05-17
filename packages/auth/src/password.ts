import bcrypt from 'bcrypt'

// Re-export the pure policy function so server-side callers can keep
// importing it from a single module. Browser-side callers should import
// from `@shiplog/auth/policy` directly to avoid pulling in bcrypt.
export { validatePasswordPolicy } from './password-policy.js'

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
