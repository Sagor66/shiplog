'use client'

import Link from 'next/link'
import { useState } from 'react'

import { validatePasswordPolicy } from '@shiplog/auth'

import { signIn, signUp } from '@/lib/auth-client'

/**
 * Sign-up page. Captures name/email/password, validates the password
 * locally against the project policy (8+ chars, letter + number), and
 * submits to Better Auth. On success the user is in a "registered but
 * not verified" state: Better Auth has already dispatched the verification
 * email and we surface a "check your inbox" view.
 *
 * We intentionally do NOT log the user in synchronously — they sign in
 * after clicking the verification link (Better Auth's
 * `autoSignInAfterVerification` setting).
 */
export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const policyError = validatePasswordPolicy(password)
    if (policyError) {
      setError(policyError)
      return
    }
    if (name.trim().length < 2) {
      setError('Please tell us your name.')
      return
    }

    setSubmitting(true)
    const { error } = await signUp.email({
      email,
      password,
      name: name.trim(),
      callbackURL: '/dashboard',
    })
    setSubmitting(false)

    if (error) {
      // Generic message to defeat user-enumeration. Better Auth returns
      // `USER_ALREADY_EXISTS` for duplicates — we hide that distinction.
      const code = error.code ?? ''
      if (code === 'TOO_MANY_REQUESTS') {
        setError('Too many attempts. Try again in a few minutes.')
      } else {
        setError(
          'We could not create your account. Check the details and try again.',
        )
      }
      return
    }

    setDone(true)
  }

  async function onGithub() {
    setError(null)
    await signIn.social({ provider: 'github', callbackURL: '/dashboard' })
  }

  if (done) {
    return (
      <main className="mx-auto max-w-md p-8">
        <h1 className="text-2xl font-semibold mb-4">Check your email</h1>
        <p className="text-sm text-gray-700">
          We sent a verification link to <strong>{email}</strong>. Click it
          to finish setting up your account. The link expires in one hour.
        </p>
        <p className="text-sm text-gray-500 mt-6">
          Didn&apos;t get it? Check spam, or{' '}
          <Link href="/login" className="underline">
            sign in
          </Link>{' '}
          to request a new one.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold mb-6">Create a ShipLog account</h1>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Name</span>
          <input
            type="text"
            required
            minLength={2}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </label>

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

        <label className="block">
          <span className="block text-sm font-medium mb-1">Password</span>
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
          {submitting ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-gray-500">
        <span className="flex-1 h-px bg-gray-200" />
        OR
        <span className="flex-1 h-px bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={onGithub}
        className="w-full border rounded py-2"
      >
        Continue with GitHub
      </button>

      <p className="mt-6 text-sm">
        Already have an account?{' '}
        <Link href="/login" className="underline">
          Sign in
        </Link>
      </p>
    </main>
  )
}
