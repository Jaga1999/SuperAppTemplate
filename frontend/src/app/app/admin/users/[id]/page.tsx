import type { Metadata } from 'next'
import { AdminUserPage } from '@/views/admin-user'

export const metadata: Metadata = { title: 'User' }

export default function Page() {
  return <AdminUserPage />
}
