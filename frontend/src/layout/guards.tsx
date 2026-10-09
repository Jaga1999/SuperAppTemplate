'use client'

import { RotateCcwIcon, ShieldAlertIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type ReactNode, useEffect } from 'react'
import { Logo } from '@/components/ui/brand/logo'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api'
import { auth } from '@/lib/auth'
import { useMe } from '@/lib/queries'

/**
 * Signed-in only.
 *  - Not signed in (401) → straight to the themed Keycloak login, then back to this exact URL.
 *  - Signed in but not allowed (403) or BFF unavailable → an explicit screen. Never a retry loop.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: me, isPending, isError, error, refetch } = useMe()

  useEffect(() => {
    if (!isPending && !isError && me === null) auth.signIn()
  }, [isPending, isError, me])

  if (isError) {
    const forbidden = error instanceof ApiError && error.status === 403
    return (
      <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 px-5 text-center">
        <Logo />
        <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-2xl">
          <ShieldAlertIcon className="size-6" />
        </div>
        <div className="max-w-sm space-y-2">
          <h1 className="text-xl font-semibold">{forbidden ? 'Your account has no access yet' : "We can't reach SuperApp right now"}</h1>
          <p className="text-muted-foreground text-sm">
            {forbidden
              ? 'You are signed in, but your account is missing the required role. Ask an administrator to grant access.'
              : 'Please check your connection and try again in a moment.'}
          </p>
        </div>
        <div className="flex gap-2">
          {!forbidden && (
            <Button onClick={() => void refetch()}>
              <RotateCcwIcon /> Try again
            </Button>
          )}
          <Button variant="outline" onClick={() => void auth.signOut()}>Sign out</Button>
        </div>
      </div>
    )
  }

  if (isPending || me === null) return <FullPageSkeleton />
  return <>{children}</>
}

/** Role gate for a route subtree. The BFF enforces the same rule; this only avoids showing a dead page. */
export function RequireRole({ role, children }: { role: 'admin'; children: ReactNode }) {
  const { data: me } = useMe()
  const router = useRouter()
  const allowed = role === 'admin' && me?.admin === true

  useEffect(() => {
    if (me && !allowed) router.replace('/app')
  }, [me, allowed, router])

  return allowed ? children : null
}

function FullPageSkeleton() {
  return (
    <div className="flex min-h-svh">
      <div className="hidden w-64 border-r p-4 md:block">
        <Skeleton className="mb-6 h-8 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
      <div className="flex-1 space-y-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}
