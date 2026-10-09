import { formatDistanceToNow, parseISO } from 'date-fns'
import { ActivityIcon, CheckCircle2Icon, PlusCircleIcon, RotateCcwIcon, SparklesIcon, Trash2Icon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@superapp/ui/components/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@superapp/ui/components/empty'
import { Skeleton } from '@superapp/ui/components/skeleton'
import { cn } from '@superapp/ui/lib/utils'
import { useActivity } from '../lib/queries'
import type { ActivityEntry } from '../lib/types'

const meta: Record<ActivityEntry['type'], { icon: ReactNode; tone: string; text: (e: ActivityEntry) => ReactNode }> = {
  TodoCreated: { icon: <PlusCircleIcon />, tone: 'bg-primary/10 text-primary', text: (e) => <>Added <b>{e.title}</b></> },
  TodoCompleted: { icon: <CheckCircle2Icon />, tone: 'bg-success/12 text-success', text: (e) => <>Completed <b>{e.title}</b></> },
  TodoReopened: { icon: <RotateCcwIcon />, tone: 'bg-warning/15 text-warning', text: (e) => <>Reopened <b>{e.title}</b></> },
  TodoDeleted: { icon: <Trash2Icon />, tone: 'bg-destructive/10 text-destructive', text: (e) => <>Deleted <b>{e.title}</b></> },
  CompletedTodosCleared: { icon: <SparklesIcon />, tone: 'bg-muted text-foreground', text: (e) => <>Cleared {e.count} completed {e.count === 1 ? 'todo' : 'todos'}</> },
}

export function ActivityPage() {
  const { data, isPending } = useActivity()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>Every change, streamed asynchronously from the event log (outbox → Kafka → this feed).</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !data?.length ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><ActivityIcon /></EmptyMedia>
              <EmptyTitle>No activity yet</EmptyTitle>
              <EmptyDescription>Create or complete a todo and it will show up here within a second.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ol className="relative space-y-1">
            <span className="bg-border absolute top-4 bottom-4 left-[17px] w-px" aria-hidden />
            {data.map((entry) => {
              const m = meta[entry.type]
              return (
                <li key={entry.id} className="animate-in fade-in relative flex items-center gap-3 rounded-lg py-2 pr-2">
                  <span className={cn('ring-background relative flex size-9 shrink-0 items-center justify-center rounded-full ring-4 [&_svg]:size-4', m.tone)}>{m.icon}</span>
                  <p className="min-w-0 flex-1 truncate text-sm [&_b]:font-medium">{m.text(entry)}</p>
                  <time className="text-muted-foreground shrink-0 text-xs" dateTime={entry.occurredAt} title={new Date(entry.occurredAt).toLocaleString()}>
                    {formatDistanceToNow(parseISO(entry.occurredAt), { addSuffix: true })}
                  </time>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
