import { headers } from 'next/headers'

import { auth, type AuthSession } from './auth.js'

/**
 * Read the current session from a Server Component or Route Handler.
 *
 * Returns `null` if no cookie is present or the session has expired.
 * The full `{ user, session }` shape comes straight from Better Auth.
 *
 * Calling this opts the route into dynamic rendering — that's the
 * correct behavior for any authenticated surface.
 *
 * @example
 *   export default async function DashboardPage() {
 *     const session = await getServerSession()
 *     if (!session) redirect('/login')
 *     return <Dashboard user={session.user} />
 *   }
 */
export async function getServerSession(): Promise<AuthSession> {
  return auth.api.getSession({
    headers: await headers(),
  })
}
