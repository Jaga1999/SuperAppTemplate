import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { SettingsLayout } from '@/views/settings/settings-layout'

export const metadata: Metadata = { title: 'Settings' }

export default function Layout({ children }: { children: ReactNode }) {
  return <SettingsLayout>{children}</SettingsLayout>
}
