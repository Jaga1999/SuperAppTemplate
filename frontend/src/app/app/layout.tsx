import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AppArea } from '@/layout/app-area'

/** The signed-in area: never indexed, never cached by intermediaries. */
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function SignedInLayout({ children }: { children: ReactNode }) {
  return <AppArea>{children}</AppArea>
}
