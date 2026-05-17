'use client'

import Link from 'next/link'
import { useState } from 'react'

import { requestPasswordReset } from '@/lib/auth-client'

/**
 * Password-reset request page. Always reports success regardless of whether
 * the email is registered — exposing that distinction would let attackers
 * harvest valid emails. Better Auth's `forgetPassword` is idempotent and
 * has a per-IP rate limit configured in [packages/auth/src/index.ts].
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await requestPasswordReset({
      email,
      redirectTo: '/reset-password',
    })
    setSubmitting(false)
    if (error && error.code === 'TOO_MANY_REQUESTS') {
      setError('Too many attempts. Try again in an hour.')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <main className="mx-auto max-w-md p-8">
        <h1 className="text-2xl font-semibold mb-4">Check your email</h1>
        <p className="text-sm text-gray-700">
          If an account exists for <strong>{email}</strong>, we&apos;ve sent
          a password-reset link. It expires in one hour.
        </p>
        <p className="text-sm text-gray-500 mt-6">
          <Link href="/login" className="underline">
            Back to sign in
          </Link>
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold mb-6">Reset your password</h1>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          {submitting ? 'Sending…' : 'Send reset link'}
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
