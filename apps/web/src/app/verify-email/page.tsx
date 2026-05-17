import Link from 'next/link'

/**
 * Landing page Better Auth bounces to when email verification fails or
 * the user hits a stale link. Successful verification has Better Auth
 * automatically sign the user in (because `autoSignInAfterVerification`
 * is enabled in our config) and redirect to the dashboard — they should
 * not normally see this page.
 */
export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold mb-4">Verify your email</h1>
      <p className="text-sm text-gray-700">
        The verification link is invalid or has expired. Sign in to request a
        new one.
      </p>
      <p className="mt-6 text-sm">
        <Link href="/login" className="underline">
          Back to sign in
        </Link>
      </p>
    </main>
  )
}
