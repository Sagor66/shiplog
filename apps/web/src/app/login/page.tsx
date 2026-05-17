import { Suspense } from 'react'

import { LoginForm } from './login-form'

/**
 * Server Component shell for the login page. `useSearchParams` (used by
 * LoginForm for the `?next=` redirect target) forces a client-side data
 * dependency; wrapping in <Suspense> is Next.js's required way to mark
 * that bailout so the rest of the segment can render.
 */
export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold mb-6">Log in to ShipLog</h1>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  )
}
