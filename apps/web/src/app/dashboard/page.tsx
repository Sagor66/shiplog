import { redirect } from 'next/navigation'

import { getServerSession } from '@/lib/get-server-session'
import { SignOutButton } from './sign-out-button'

/**
 * Minimal authenticated landing page. Demonstrates the two server-side
 * pieces every protected route needs:
 *
 *   - {@link getServerSession} for the authoritative session check.
 *   - A `redirect('/login')` fallback when no session exists. The Proxy
 *     already optimistically redirected — this is the defense in depth.
 */
export default async function DashboardPage() {
  const session = await getServerSession()
  if (!session) {
    redirect('/login?next=/dashboard')
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <SignOutButton />
      </header>

      <p className="text-sm text-gray-700">
        Signed in as <strong>{session.user.email}</strong>
        {session.user.name ? ` (${session.user.name})` : null}.
      </p>
    </main>
  )
}
