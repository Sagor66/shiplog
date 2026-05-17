import Link from 'next/link'
import { Suspense } from 'react'

import { ResetPasswordForm } from './reset-password-form'

/**
 * Server Component shell. `useSearchParams` (used inside the form to
 * read the `?token=` value) is wrapped in <Suspense> as Next.js requires.
 */
export default function ResetPasswordPage() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold mb-6">Choose a new password</h1>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
      <p className="mt-6 text-sm">
        <Link href="/login" className="underline">
          Back to sign in
        </Link>
      </p>
    </main>
  )
}
