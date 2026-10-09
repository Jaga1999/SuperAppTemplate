import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, api } from './api'
import type {
  ActivityEntry,
  AdminOverview,
  AdminUser,
  Me,
  Page,
  Priority,
  PublicConfig,
  SecurityOverview,
  SessionView,
  Todo,
  TodoStats,
  TodoStatus,
} from './types'

/** Query keys in one place: invalidation stays correct as the app grows. */
export const keys = {
  me: ['me'] as const,
  publicConfig: ['public-config'] as const,
  todos: (status: TodoStatus, q: string) => ['todos', status, q] as const,
  todosAll: ['todos'] as const,
  stats: ['todo-stats'] as const,
  activity: ['activity'] as const,
  sessions: ['sessions'] as const,
  security: ['security'] as const,
  adminOverview: ['admin', 'overview'] as const,
  adminUsers: (page: number) => ['admin', 'users', page] as const,
}

/** null = not signed in (401). The whole app's auth state derives from this one query. */
export const meQuery = queryOptions({
  queryKey: keys.me,
  queryFn: async (): Promise<Me | null> => {
    try {
      return await api.get<Me>('/api/v1/me')
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null
      throw e
    }
  },
  staleTime: 60_000,
  // A failed /me must not refetch every time a component subscribes (that would remount-loop the guard).
  retryOnMount: false,
})

export const useMe = () => useQuery(meQuery)

export const usePublicConfig = () =>
  useQuery({ queryKey: keys.publicConfig, queryFn: () => api.get<PublicConfig>('/api/v1/public/config'), staleTime: Infinity })

export const useTodos = (status: TodoStatus, q: string) =>
  useQuery({
    queryKey: keys.todos(status, q),
    queryFn: () => api.get<Page<Todo>>(`/api/v1/todos?status=${status}&size=100${q ? `&q=${encodeURIComponent(q)}` : ''}`),
    placeholderData: keepPreviousData,
  })

export const useTodoStats = () => useQuery({ queryKey: keys.stats, queryFn: () => api.get<TodoStats>('/api/v1/todos/stats') })

export const useActivity = () =>
  useQuery({ queryKey: keys.activity, queryFn: () => api.get<ActivityEntry[]>('/api/v1/activity?limit=50'), refetchInterval: 15_000 })

export const useSessions = () => useQuery({ queryKey: keys.sessions, queryFn: () => api.get<SessionView[]>('/api/v1/account/sessions') })

export const useSecurity = () => useQuery({ queryKey: keys.security, queryFn: () => api.get<SecurityOverview>('/api/v1/account/security') })

export const useAdminOverview = () => useQuery({ queryKey: keys.adminOverview, queryFn: () => api.get<AdminOverview>('/api/v1/admin/overview') })

export const useAdminUsers = (page: number) =>
  useQuery({
    queryKey: keys.adminUsers(page),
    queryFn: () => api.get<Page<AdminUser>>(`/api/v1/admin/users?page=${page}&size=20`),
    placeholderData: keepPreviousData,
  })

export function errorToast(error: unknown) {
  if (error instanceof ApiError) {
    toast.error(error.problem.title ?? 'Something went wrong', { description: error.problem.detail })
  } else {
    toast.error('Network error', { description: 'Check your connection and try again.' })
  }
}

function useInvalidateTodos() {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.todosAll }),
      qc.invalidateQueries({ queryKey: keys.stats }),
      // The activity feed is filled asynchronously via Kafka; refresh shortly after.
      new Promise((r) => setTimeout(r, 600)).then(() => qc.invalidateQueries({ queryKey: keys.activity })),
    ])
}

export type NewTodo = { title: string; notes?: string; priority?: Priority; dueDate?: string | null }
export type TodoPatch = Partial<Pick<Todo, 'title' | 'notes' | 'completed' | 'priority'>> & {
  version: number
  dueDate?: string | null
  clearDueDate?: boolean
}

export function useCreateTodo() {
  const invalidate = useInvalidateTodos()
  return useMutation({
    mutationFn: (todo: NewTodo) => api.post<Todo>('/api/v1/todos', todo),
    onSuccess: invalidate,
    onError: errorToast,
  })
}

/** Optimistic update: the checkbox flips instantly; rolls back on conflict or error. */
export function useUpdateTodo() {
  const qc = useQueryClient()
  const invalidate = useInvalidateTodos()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TodoPatch }) => api.patch<Todo>(`/api/v1/todos/${id}`, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: keys.todosAll })
      const snapshots = qc.getQueriesData<Page<Todo>>({ queryKey: keys.todosAll })
      for (const [key, data] of snapshots) {
        if (!data) continue
        qc.setQueryData<Page<Todo>>(key, {
          ...data,
          content: data.content.map((t) =>
            t.id === id
              ? { ...t, ...patch, dueDate: patch.clearDueDate ? null : (patch.dueDate ?? t.dueDate) }
              : t,
          ),
        })
      }
      return { snapshots }
    },
    onError: (error, _vars, context) => {
      context?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
      errorToast(error)
    },
    onSettled: invalidate,
  })
}

export function useDeleteTodo() {
  const invalidate = useInvalidateTodos()
  return useMutation({ mutationFn: (id: string) => api.delete(`/api/v1/todos/${id}`), onSuccess: invalidate, onError: errorToast })
}

export function useClearCompleted() {
  const invalidate = useInvalidateTodos()
  return useMutation({
    mutationFn: () => api.post<{ cleared: number }>('/api/v1/todos/clear-completed'),
    onSuccess: async (r) => {
      toast.success(`Cleared ${r.cleared} completed ${r.cleared === 1 ? 'todo' : 'todos'}`)
      await invalidate()
    },
    onError: errorToast,
  })
}

export function useEndSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/account/sessions/${id}`),
    onSuccess: () => {
      toast.success('Session signed out')
      return qc.invalidateQueries({ queryKey: keys.sessions })
    },
    onError: errorToast,
  })
}

export function useSignOutOthers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/api/v1/account/sessions/sign-out-others'),
    onSuccess: () => {
      toast.success('Signed out of all other devices')
      return qc.invalidateQueries({ queryKey: keys.sessions })
    },
    onError: errorToast,
  })
}

export function useSignOutEverywhere() {
  return useMutation({
    mutationFn: () => api.post('/api/v1/account/sessions/sign-out-all'),
    onSuccess: () => window.location.assign('/?signed_out=everywhere'),
    onError: errorToast,
  })
}

export function useUnlinkProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (alias: string) => api.delete(`/api/v1/account/linked-providers/${alias}`),
    onSuccess: () => {
      toast.success('Account unlinked')
      return qc.invalidateQueries({ queryKey: keys.security })
    },
    onError: errorToast,
  })
}

export function useAdminSignOut() {
  return useMutation({
    mutationFn: (userId: string) => api.post(`/api/v1/admin/users/${userId}/sign-out`),
    onSuccess: () => toast.success('User signed out everywhere'),
    onError: errorToast,
  })
}
