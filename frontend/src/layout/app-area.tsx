'use client'

import type { ReactNode } from 'react'
import { AppShell } from './app-shell'
import { RequireAuth } from './guards'

/** Everything under /app: signed-in users only, inside the sidebar shell. */
export function AppArea({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  )
}
