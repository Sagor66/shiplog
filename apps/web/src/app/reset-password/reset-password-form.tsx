'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { validatePasswordPolicy } from '@shiplog/auth/policy'

import { resetPassword } from '@/lib/auth-client'

/**
 * Reset-password form. Reached by clicking the email link which carries
 * `?token=…`. Better Auth validates the token, swaps the password, and
 * rotates the session — invalidating any existing logged-in sessions for
 * the user (defense against an attacker holding a stolen cookie).
 *
 * Split from the page shell because `useSearchParams` forces dynamic
 * rendering; Next.js requires the bailout to live inside a <Suspense>.
 */
export function ResetPasswordForm() {
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError('Reset link is invalid or expired. Request a new one.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    const policyError = validatePasswordPolicy(password)
    if (policyError) {
      setError(policyError)
      return
    }

    setSubmitting(true)
    const { error } = await resetPassword({ newPassword: password, token })
    setSubmitting(false)
    if (error) {
      setError('Reset link is invalid or expired. Request a new one.')
      return
    }
    router.push('/login?reset=ok')
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <label className="block">
        <span className="block text-sm font-medium mb-1">New password</span>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <span className="block text-xs text-gray-500 mt-1">
          At least 8 characters, with a letter and a number.
        </span>
      </label>

      <label className="block">
        <span className="block text-sm font-medium mb-1">
          Confirm new password
        </span>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-black text-white rounded py-2 disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'Set new password'}
      </button>
    </form>
  )
}
