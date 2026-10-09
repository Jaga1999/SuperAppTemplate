'use client'

import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { ArrowLeftIcon, GlobeIcon, KeyRoundIcon, LinkIcon, LogOutIcon, MonitorSmartphoneIcon, ShieldOffIcon } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { type ReactNode, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminEndSession, useAdminSignOut, useAdminUser } from '@/lib/queries'

const credentialLabels: Record<string, string> = {
  password: 'Password',
  otp: 'Authenticator app',
  webauthn: 'Security key',
  'webauthn-passwordless': 'Passkey',
  'recovery-authn-codes': 'Recovery codes',
}

/** One user as an admin sees it: profile, sign-in methods and every live session, each of which can be ended. */
export function AdminUserPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isPending } = useAdminUser(id)
  const endSession = useAdminEndSession(id)
  const signOutAll = useAdminSignOut()
  const [confirmAll, setConfirmAll] = useState(false)

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    )
  }
  if (!data) return null

  const { user, sessions } = data
  const name = user.displayName || [data.firstName, data.lastName].filter(Boolean).join(' ') || user.email || 'Erased user'

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/app/admin"><ArrowLeftIcon /> All users</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">{name}</h2>
          <Badge variant={user.status === 'ACTIVE' ? 'secondary' : 'outline'}>{user.status.toLowerCase()}</Badge>
          {!data.inKeycloak && <Badge variant="destructive">Not in Keycloak</Badge>}
          {data.inKeycloak && !data.enabled && <Badge variant="outline" className="gap-1"><ShieldOffIcon className="size-3" /> Disabled</Badge>}
        </div>
        <p className="text-muted-foreground text-sm">{user.email ?? 'Personal data erased'}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="User id"><code className="text-xs break-all">{user.id}</code></Fact>
            <Fact label="Member since">{format(parseISO(user.createdAt), 'd MMM yyyy')}</Fact>
            <Fact label="Last sign-in">{user.lastLoginAt ? formatDistanceToNow(parseISO(user.lastLoginAt), { addSuffix: true }) : 'Never'}</Fact>
            <Fact label="Email">{data.emailVerified ? 'Verified' : 'Not verified'}</Fact>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            {data.credentialTypes.map((t) => (
              <Badge key={t} variant="outline" className="gap-1"><KeyRoundIcon className="size-3" /> {credentialLabels[t] ?? t}</Badge>
            ))}
            {data.linkedProviders.map((p) => (
              <Badge key={p.alias} variant="outline" className="gap-1 capitalize"><LinkIcon className="size-3" /> {p.alias}</Badge>
            ))}
            {data.inKeycloak && data.credentialTypes.length === 0 && data.linkedProviders.length === 0 && (
              <span className="text-muted-foreground text-xs">No sign-in method set up yet</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>Sessions</CardTitle>
            <CardDescription>Every device signed in right now. Ending a session takes effect immediately.</CardDescription>
          </div>
          {sessions.length > 0 && (
            <Button variant="outline" size="sm" disabled={signOutAll.isPending} onClick={() => setConfirmAll(true)}>
              <LogOutIcon /> Sign out everywhere
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No active sessions.</p>
          ) : (
            <ul className="space-y-3">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center gap-4 rounded-xl border p-4">
                  <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg"><MonitorSmartphoneIcon className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <GlobeIcon className="text-muted-foreground size-3.5" />
                      {s.ipAddress ?? 'Unknown location'}
                      {s.rememberMe && <Badge variant="outline">Remembered</Badge>}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Started {formatDistanceToNow(parseISO(s.startedAt), { addSuffix: true })} · active {formatDistanceToNow(parseISO(s.lastAccessAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" disabled={endSession.isPending} onClick={() => endSession.mutate(s.id)}>
                    <LogOutIcon /> End
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmAll} onOpenChange={setConfirmAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out {name} everywhere?</AlertDialogTitle>
            <AlertDialogDescription>
              Every session on every device ends immediately. They can sign in again right away; nothing else changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => signOutAll.mutate(user.id)}>Sign out everywhere</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
