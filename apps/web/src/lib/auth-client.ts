'use client'

import { createShipLogAuthClient } from '@shiplog/auth/client'

/**
 * Browser-side Better Auth client. Same-origin by default — requests go to
 * `/api/auth/*` on the Next.js app, which is where the handler is mounted.
 *
 * Exports the hooks and actions consumers will use:
 *   - `useSession()` — reactive session state for client components
 *   - `signIn.email({ email, password })`
 *   - `signIn.social({ provider: 'github', callbackURL: '/dashboard' })`
 *   - `signUp.email({ email, password, name })`
 *   - `signOut()`
 *   - `forgetPassword({ email, redirectTo })`
 *   - `resetPassword({ newPassword, token })`
 *   - `sendVerificationEmail({ email, callbackURL })`
 */
export const authClient = createShipLogAuthClient()

export const {
  useSession,
  signIn,
  signOut,
  signUp,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  getSession,
} = authClient
