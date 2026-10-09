'use client'

import { createContext, type ReactNode, useContext, useState } from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'

/**
 * Client UI state of the admin area (server data lives in TanStack Query). One store per provider instance, never a
 * module-level singleton, so server rendering can't share state between requests. It lives in the admin layout, so
 * the users list keeps its page while an admin opens a user and comes back.
 */
type AdminUsersState = {
  page: number
  setPage: (page: number) => void
}

const AdminUsersStoreContext = createContext<StoreApi<AdminUsersState> | null>(null)

export function AdminUsersStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() =>
    createStore<AdminUsersState>()((set) => ({
      page: 0,
      setPage: (page) => set({ page: Math.max(0, page) }),
    })),
  )
  return <AdminUsersStoreContext value={store}>{children}</AdminUsersStoreContext>
}

export function useAdminUsersStore<T>(selector: (state: AdminUsersState) => T): T {
  const store = useContext(AdminUsersStoreContext)
  if (!store) throw new Error('useAdminUsersStore must be used inside <AdminUsersStoreProvider>')
  return useStore(store, selector)
}
