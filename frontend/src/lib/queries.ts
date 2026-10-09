import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, api } from './api'
import type { AdminOverview, AdminUser, Me, Page, PublicConfig, SecurityOverview, SessionView } from './types'

/** Query keys in one place: invalidation stays correct as the app grows. */
export const keys = {
  me: ['me'] as const,
  publicConfig: ['public-config'] as const,
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
