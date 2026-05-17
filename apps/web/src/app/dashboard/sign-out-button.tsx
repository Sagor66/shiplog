'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { signOut } from '@/lib/auth-client'

/**
 * Sign-out button. Better Auth's `signOut` deletes the server-side session
 * row AND clears the browser cookie. We then refresh the router so the
 * RSC tree re-evaluates `getServerSession()` and the user falls through
 * to the login redirect.
 */
export function SignOutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true)
        await signOut()
        router.replace('/login')
        router.refresh()
      }}
      className="text-sm underline"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
