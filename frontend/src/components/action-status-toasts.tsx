'use client'

import { useQueryClient } from '@tanstack/react-query'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'

const authErrors: Record<string, string> = {
  access_denied: 'Sign-in was cancelled.',
  session_expired: 'Your sign-in took too long. Please try again.',
  login_failed: "We couldn't sign you in. Please try again.",
}

/**
 * The BFF reports outcomes of redirects through query parameters:
 *  ?action=success|cancelled|error  after a Keycloak account action (password, passkey, OTP…)
 *  ?auth_error=…                     after a failed sign-in
 *  ?signed_out=everywhere           after "sign out of all devices"
 * Show a toast once, refresh affected data, then clean the URL.
 */
export function ActionStatusToasts() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const qc = useQueryClient()

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const action = params.get('action')
    const authError = params.get('auth_error')
    const signedOut = params.get('signed_out')
    if (!action && !authError && !signedOut) return

    if (action === 'success') {
      toast.success('Saved', { description: 'Your account was updated.' })
      void qc.invalidateQueries()
    } else if (action === 'cancelled') {
      toast.info('No changes made')
    } else if (action === 'error') {
      toast.error('That did not work', { description: 'Please try again.' })
    }
    if (authError) toast.error(authErrors[authError] ?? authErrors.login_failed)
    if (signedOut) toast.success('Signed out of every device')

    params.delete('action')
    params.delete('auth_error')
    params.delete('signed_out')
    const rest = params.toString()
    router.replace(`${pathname}${rest ? `?${rest}` : ''}` as Route, { scroll: false })
  }, [searchParams, pathname, router, qc])

  return null
}
