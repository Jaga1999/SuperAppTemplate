import { format, isBefore, parseISO, startOfToday } from 'date-fns'
import {
  CalendarIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  CrownIcon,
  FlagIcon,
  ListTodoIcon,
  LockIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react'
import { type FormEvent, useDeferredValue, useState } from 'react'
import { Badge } from '@superapp/ui/components/badge'
import { Button } from '@superapp/ui/components/button'
import { Calendar } from '@superapp/ui/components/calendar'
import { Card, CardContent } from '@superapp/ui/components/card'
import { Checkbox } from '@superapp/ui/components/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@superapp/ui/components/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@superapp/ui/components/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@superapp/ui/components/empty'
import { Input } from '@superapp/ui/components/input'
import { Label } from '@superapp/ui/components/label'
import { Popover, PopoverContent, PopoverTrigger } from '@superapp/ui/components/popover'
import { Progress } from '@superapp/ui/components/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@superapp/ui/components/select'
import { Skeleton } from '@superapp/ui/components/skeleton'
import { Spinner } from '@superapp/ui/components/spinner'
import { Tabs, TabsList, TabsTrigger } from '@superapp/ui/components/tabs'
import { Textarea } from '@superapp/ui/components/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@superapp/ui/components/tooltip'
import { cn } from '@superapp/ui/lib/utils'
import { useClearCompleted, useCreateTodo, useDeleteTodo, useMe, useTodoStats, useTodos, useUpdateTodo } from '../lib/queries'
import type { Priority, Todo, TodoStatus } from '../lib/types'

const priorities: { value: Priority; label: string; className: string }[] = [
  { value: 'NONE', label: 'No priority', className: '' },
  { value: 'LOW', label: 'Low', className: 'bg-muted text-muted-foreground' },
  { value: 'MEDIUM', label: 'Medium', className: 'bg-warning/15 text-warning' },
  { value: 'HIGH', label: 'High', className: 'bg-destructive/10 text-destructive' },
]

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export function TodosPage() {
  const { data: me } = useMe()
  const [status, setStatus] = useState<TodoStatus>('ALL')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim())
  const todos = useTodos(status, deferredQuery)
  const stats = useTodoStats()
  const clear = useClearCompleted()
  const [editing, setEditing] = useState<Todo | null>(null)
  const premium = !!me?.premium

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {greeting()}, {me?.givenName || me?.displayName?.split(' ')[0] || 'there'}
        </h2>
        <p className="text-muted-foreground text-sm">Here is what is on your plate.</p>
      </div>

      <StatsRow />

      <Composer premium={premium} quotaReached={!premium && !!stats.data && stats.data.freeOpenLimit !== null && stats.data.open >= stats.data.freeOpenLimit} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs value={status} onValueChange={(v) => setStatus(v as TodoStatus)}>
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="OPEN">Open</TabsTrigger>
            <TabsTrigger value="DONE">Done</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative sm:ml-auto sm:w-64">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search todos" className="pl-8" aria-label="Search todos" />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2" aria-label="Clear search">
              <XIcon className="size-4" />
            </button>
          )}
        </div>
        <Button variant="outline" disabled={!stats.data?.completed || clear.isPending} onClick={() => clear.mutate()}>
          <CheckCircle2Icon /> Clear completed
        </Button>
      </div>

      {todos.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : todos.data && todos.data.content.length > 0 ? (
        <ul className={cn('space-y-2 transition-opacity', todos.isPlaceholderData && 'opacity-60')}>
          {todos.data.content.map((todo) => (
            <TodoRow key={todo.id} todo={todo} onEdit={() => setEditing(todo)} />
          ))}
        </ul>
      ) : (
        <Empty className="rounded-2xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon"><ListTodoIcon /></EmptyMedia>
            <EmptyTitle>{deferredQuery ? 'No matches' : status === 'DONE' ? 'Nothing completed yet' : 'All clear'}</EmptyTitle>
            <EmptyDescription>
              {deferredQuery ? 'Try a different search.' : status === 'DONE' ? 'Completed todos show up here.' : 'Add your first todo above and get going.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <EditTodoDialog todo={editing} premium={premium} onClose={() => setEditing(null)} />
    </div>
  )
}

function StatsRow() {
  const { data: stats } = useTodoStats()
  const cards = [
    { label: 'Open', value: stats?.open, icon: CircleDotIcon, tone: 'text-primary' },
    { label: 'Completed', value: stats?.completed, icon: CheckCircle2Icon, tone: 'text-success' },
    { label: 'Overdue', value: stats?.overdue, icon: TriangleAlertIcon, tone: 'text-destructive' },
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className="gap-0 py-4">
          <CardContent className="flex items-center justify-between px-4">
            <div>
              <p className="text-muted-foreground text-xs font-medium">{c.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{c.value ?? '–'}</p>
            </div>
            <c.icon className={cn('size-5', c.tone)} />
          </CardContent>
        </Card>
      ))}
      <Card className="gap-0 py-4">
        <CardContent className="px-4">
          {stats?.freeOpenLimit != null ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-medium">Free plan</p>
                <p className="text-xs tabular-nums">{stats.open}/{stats.freeOpenLimit}</p>
              </div>
              <Progress value={(stats.open / stats.freeOpenLimit) * 100} className="mt-3 h-1.5" />
              <p className="text-muted-foreground mt-2 text-xs">open todos used</p>
            </>
          ) : (
            <div className="flex h-full items-center gap-3">
              <span className="bg-brand-gradient flex size-9 items-center justify-center rounded-lg text-white"><CrownIcon className="size-4" /></span>
              <div>
                <p className="text-sm font-semibold">Premium</p>
                <p className="text-muted-foreground text-xs">Unlimited todos</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PremiumLock({ children, premium }: { children: React.ReactNode; premium: boolean }) {
  if (premium) return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{children}</span>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-1.5"><CrownIcon className="size-3" /> Premium feature</TooltipContent>
    </Tooltip>
  )
}

function Composer({ premium, quotaReached }: { premium: boolean; quotaReached: boolean }) {
  const create = useCreateTodo()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('NONE')
  const [due, setDue] = useState<Date | undefined>()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    create.mutate(
      { title: title.trim(), priority: premium ? priority : undefined, dueDate: premium && due ? format(due, 'yyyy-MM-dd') : undefined },
      {
        onSuccess: () => {
          setTitle('')
          setPriority('NONE')
          setDue(undefined)
        },
      },
    )
  }

  return (
    <Card className="py-3">
      <CardContent className="px-3">
        <form onSubmit={submit} className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <PlusIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder={quotaReached ? 'Free plan limit reached: complete a todo or upgrade' : 'Add a todo and press Enter'}
              disabled={quotaReached}
              className="h-10 border-0 pl-9 text-[0.95rem] shadow-none focus-visible:ring-0 dark:bg-transparent"
              aria-label="New todo title"
            />
          </div>
          <div className="flex items-center gap-2">
            <PremiumLock premium={premium}>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)} disabled={!premium}>
                <SelectTrigger className="h-9 w-[8.5rem]" aria-label="Priority">
                  {premium ? <FlagIcon /> : <LockIcon />}
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PremiumLock>
            <PremiumLock premium={premium}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="h-9" disabled={!premium}>
                    {premium ? <CalendarIcon /> : <LockIcon />}
                    {due ? format(due, 'MMM d') : 'Due date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="single" selected={due} onSelect={setDue} disabled={{ before: startOfToday() }} />
                </PopoverContent>
              </Popover>
            </PremiumLock>
            <Button type="submit" className="h-9 px-4" disabled={!title.trim() || create.isPending || quotaReached}>
              {create.isPending ? <Spinner /> : <PlusIcon />} Add
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function TodoRow({ todo, onEdit }: { todo: Todo; onEdit: () => void }) {
  const update = useUpdateTodo()
  const remove = useDeleteTodo()
  const priority = priorities.find((p) => p.value === todo.priority)
  const overdue = !todo.completed && todo.dueDate && isBefore(parseISO(todo.dueDate), startOfToday())

  return (
    <li className="group bg-card hover:border-primary/25 animate-in fade-in flex items-start gap-3 rounded-xl border p-3.5 transition-colors duration-300">
      <Checkbox
        checked={todo.completed}
        onCheckedChange={(checked) => update.mutate({ id: todo.id, patch: { version: todo.version, completed: checked === true } })}
        aria-label={todo.completed ? `Mark "${todo.title}" as open` : `Complete "${todo.title}"`}
        className="mt-0.5 size-5 rounded-full"
      />
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p className={cn('text-[0.95rem] leading-snug break-words transition-colors', todo.completed && 'text-muted-foreground line-through')}>{todo.title}</p>
        {todo.notes && <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">{todo.notes}</p>}
        {(priority?.value !== 'NONE' || todo.dueDate) && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {priority && priority.value !== 'NONE' && (
              <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium', priority.className)}>
                <FlagIcon className="size-3" /> {priority.label}
              </span>
            )}
            {todo.dueDate && (
              <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium', overdue ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground')}>
                <CalendarIcon className="size-3" /> {overdue ? 'Overdue · ' : ''}{format(parseISO(todo.dueDate), 'MMM d')}
              </span>
            )}
          </div>
        )}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="opacity-60 group-hover:opacity-100 data-[state=open]:opacity-100" aria-label="Todo actions">
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}><PencilIcon /> Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => remove.mutate(todo.id)}><Trash2Icon /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}

function EditTodoDialog({ todo, premium, onClose }: { todo: Todo | null; premium: boolean; onClose: () => void }) {
  return (
    <Dialog open={!!todo} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {todo && <EditTodoForm key={todo.id} todo={todo} premium={premium} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function EditTodoForm({ todo, premium, onDone }: { todo: Todo; premium: boolean; onDone: () => void }) {
  const update = useUpdateTodo()
  const [title, setTitle] = useState(todo.title)
  const [notes, setNotes] = useState(todo.notes ?? '')
  const [priority, setPriority] = useState<Priority>(todo.priority)
  const [due, setDue] = useState<Date | undefined>(todo.dueDate ? parseISO(todo.dueDate) : undefined)

  const save = (event: FormEvent) => {
    event.preventDefault()
    update.mutate(
      {
        id: todo.id,
        patch: {
          version: todo.version,
          title: title.trim(),
          notes,
          ...(premium ? { priority, dueDate: due ? format(due, 'yyyy-MM-dd') : undefined, clearDueDate: !due && !!todo.dueDate } : {}),
        },
      },
      { onSuccess: onDone },
    )
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <DialogHeader>
        <DialogTitle>Edit todo</DialogTitle>
        <DialogDescription>Changes are saved to your account and synced to the activity feed.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-2">
        <Label htmlFor="edit-title">Title</Label>
        <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required autoFocus />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="edit-notes">Notes</Label>
        <Textarea id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={3} placeholder="Add details…" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label className="flex items-center gap-1.5">Priority {!premium && <Badge variant="secondary" className="gap-1 px-1.5 text-[0.65rem]"><CrownIcon className="size-2.5" />Premium</Badge>}</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as Priority)} disabled={!premium}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {priorities.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label className="flex items-center gap-1.5">Due date {!premium && <Badge variant="secondary" className="gap-1 px-1.5 text-[0.65rem]"><CrownIcon className="size-2.5" />Premium</Badge>}</Label>
          <div className="flex gap-1.5">
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="flex-1 justify-start font-normal" disabled={!premium}>
                  <CalendarIcon /> {due ? format(due, 'PPP') : 'No due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={due} onSelect={setDue} />
              </PopoverContent>
            </Popover>
            {due && premium && (
              <Button type="button" variant="ghost" size="icon" onClick={() => setDue(undefined)} aria-label="Remove due date"><XIcon /></Button>
            )}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={!title.trim() || update.isPending}>{update.isPending && <Spinner />} Save changes</Button>
      </DialogFooter>
    </form>
  )
}
