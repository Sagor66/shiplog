'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { validatePasswordPolicy } from '@shiplog/auth'

import { resetPassword } from '@/lib/auth-client'

/**
 * Password-reset landing page. Reached by clicking the email link, which
 * carries `?token=...`. Better Auth validates the token, swaps the
 * password, and (importantly for security) rotates the session — so any
 * existing logged-in sessions for this user are invalidated.
 */
export default function ResetPasswordPage() {
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
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold mb-6">Choose a new password</h1>
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
      <p className="mt-6 text-sm">
        <Link href="/login" className="underline">
          Back to sign in
        </Link>
      </p>
    </main>
  )
}
