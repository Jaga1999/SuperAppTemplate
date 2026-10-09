import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { RequireRole } from '@/layout/guards'
import { AdminUsersStoreProvider } from '@/stores/admin-users-store'

export const metadata: Metadata = { title: 'Admin' }

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole role="admin">
      <AdminUsersStoreProvider>{children}</AdminUsersStoreProvider>
    </RequireRole>
  )
}
