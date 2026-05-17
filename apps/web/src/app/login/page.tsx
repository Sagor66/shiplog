'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { signIn } from '@/lib/auth-client'

/**
 * Login page. Two paths:
 *
 *   - Email + password (with rate-limit-aware error handling).
 *   - GitHub OAuth via Better Auth's hosted /callback/github flow.
 *
 * Errors are intentionally generic ("Invalid email or password") to avoid
 * disclosing which of the two fields was wrong — that information would
 * help username-enumeration attacks. The only specific error we surface
 * is "email not verified," because Better Auth's flow needs the user to
 * see it to recover.
 */
export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await signIn.email({ email, password, callbackURL: next })
    setSubmitting(false)
    if (error) {
      // Better Auth surfaces a stable code on `error.code`. We translate
      // to user-facing copy here; any unmapped code becomes the generic
      // fallback to avoid leaking server-side detail.
      const code = error.code ?? ''
      if (code === 'EMAIL_NOT_VERIFIED') {
        setError(
          'Your email is not verified. Check your inbox for the verification link.',
        )
      } else if (code === 'TOO_MANY_REQUESTS') {
        setError('Too many attempts. Try again in a few minutes.')
      } else {
        setError('Invalid email or password.')
      }
      return
    }
    router.push(next)
    router.refresh()
  }

  async function onGithub() {
    setError(null)
    await signIn.social({ provider: 'github', callbackURL: next })
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold mb-6">Log in to ShipLog</h1>

      <form onSubmit={onEmailSubmit} className="space-y-4" noValidate>
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {submitting ? 'Signing in…' : 'Sign in'}
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

      <div className="mt-6 flex justify-between text-sm">
        <Link href="/signup" className="underline">
          Create an account
        </Link>
        <Link href="/forgot-password" className="underline">
          Forgot password?
        </Link>
      </div>
    </main>
  )
}
