'use client'

import { formatDistanceToNow, parseISO } from 'date-fns'
import { CheckCircle2Icon, LogOutIcon, UserPlusIcon, UsersIcon } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAdminOverview, useAdminSignOut, useAdminUsers } from '@/lib/queries'
import type { AdminUser } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAdminUsersStore } from '@/stores/admin-users-store'

export function AdminPage() {
  const { data: overview } = useAdminOverview()
  const page = useAdminUsersStore((s) => s.page)
  const setPage = useAdminUsersStore((s) => s.setPage)
  const users = useAdminUsers(page)
  const signOut = useAdminSignOut()
  // Ending every session of another user is disruptive: confirm first. One dialog, driven by the selected row.
  const [confirmSignOut, setConfirmSignOut] = useState<AdminUser | null>(null)

  const stats = [
    { label: 'Active users', value: overview?.activeUsers, hint: `${overview?.keycloakUsers ?? '–'} in Keycloak`, icon: UsersIcon },
    { label: 'Sign-ups (7 days)', value: overview?.signupsLast7Days, icon: UserPlusIcon },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Admin</h2>
        <p className="text-muted-foreground text-sm">Requires the <code className="bg-muted rounded px-1 text-xs">admin</code> role, enforced by the BFF.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {stats.map((s) => (
          <Card key={s.label} className="gap-0 py-4">
            <CardContent className="flex items-start justify-between px-4">
              <div>
                <p className="text-muted-foreground text-xs font-medium">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value ?? '–'}</p>
                {s.hint && <p className="text-muted-foreground mt-0.5 text-xs">{s.hint}</p>}
              </div>
              <s.icon className="text-muted-foreground size-5" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Local projection of Keycloak users. Sign-out ends every session instantly.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last sign-in</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody className={cn(users.isPlaceholderData && 'opacity-60')}>
              {users.isPending
                ? Array.from({ length: 4 }, (_, i) => (
                    <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                  ))
                : users.data?.content.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <Link href={`/app/admin/users/${u.id}`} className="hover:underline focus-visible:underline">
                          <p className="font-medium">{u.displayName || '—'}</p>
                          <p className="text-muted-foreground text-xs">{u.email ?? 'erased'}</p>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.status === 'ACTIVE' ? 'secondary' : 'outline'} className="gap-1">
                          {u.status === 'ACTIVE' && <CheckCircle2Icon className="text-success size-3" />}
                          {u.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {u.lastLoginAt ? formatDistanceToNow(parseISO(u.lastLoginAt), { addSuffix: true }) : 'never'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" disabled={u.status === 'DELETED' || signOut.isPending} onClick={() => setConfirmSignOut(u)}>
                          <LogOutIcon /> Sign out
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
          {users.data && users.data.page.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <span className="text-muted-foreground text-xs">Page {page + 1} of {users.data.page.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= users.data.page.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmSignOut !== null} onOpenChange={(open) => !open && setConfirmSignOut(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out {confirmSignOut?.displayName || confirmSignOut?.email || 'this user'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Every session on every device ends immediately. They can sign in again right away; nothing else changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirmSignOut) signOut.mutate(confirmSignOut.id)
                setConfirmSignOut(null)
              }}
            >
              Sign out everywhere
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
