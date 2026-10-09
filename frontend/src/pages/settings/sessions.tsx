import { formatDistanceToNow, parseISO } from 'date-fns'
import { GlobeIcon, LogOutIcon, MonitorSmartphoneIcon, ShieldAlertIcon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useEndSession, useSessions, useSignOutEverywhere, useSignOutOthers } from '../../lib/queries'

export function SessionsSettings() {
  const { data: sessions, isPending } = useSessions()
  const end = useEndSession()
  const others = useSignOutOthers()
  const everywhere = useSignOutEverywhere()
  const otherCount = sessions?.filter((s) => !s.current).length ?? 0

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Where you're signed in</CardTitle>
          <CardDescription>Signing a device out takes effect immediately, even for requests already in flight.</CardDescription>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="space-y-3">{Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
          ) : (
            <ul className="space-y-3">
              {sessions?.map((s) => (
                <li key={s.id} className="flex items-center gap-4 rounded-xl border p-4">
                  <span className="bg-muted flex size-10 items-center justify-center rounded-lg"><MonitorSmartphoneIcon className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <GlobeIcon className="text-muted-foreground size-3.5" />
                      {s.ipAddress ?? 'Unknown location'}
                      {s.current && <Badge className="bg-success/12 text-success border-0">This device</Badge>}
                      {s.rememberMe && <Badge variant="outline">Remembered</Badge>}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Signed in {formatDistanceToNow(parseISO(s.startedAt), { addSuffix: true })} · active {formatDistanceToNow(parseISO(s.lastAccessAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!s.current && (
                    <Button variant="outline" size="sm" disabled={end.isPending} onClick={() => end.mutate(s.id)}>
                      <LogOutIcon /> Sign out
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {otherCount > 0 && (
            <Button variant="outline" className="mt-4" disabled={others.isPending} onClick={() => others.mutate()}>
              Sign out of {otherCount} other {otherCount === 1 ? 'device' : 'devices'}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldAlertIcon className="text-destructive size-4" /> Sign out everywhere</CardTitle>
          <CardDescription>Lost a device or seeing something unusual? End every session, including this one.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Sign out everywhere</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out of every device?</AlertDialogTitle>
                <AlertDialogDescription>All sessions end immediately, including this one. You'll need to sign in again everywhere.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={() => everywhere.mutate()}>Sign out everywhere</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
