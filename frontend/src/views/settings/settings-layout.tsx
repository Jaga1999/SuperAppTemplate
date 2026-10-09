'use client'

import { KeyRoundIcon, MonitorSmartphoneIcon, UserIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const tabs: { to: Route; label: string; icon: typeof UserIcon; end?: boolean }[] = [
  { to: '/app/settings', label: 'Profile', icon: UserIcon, end: true },
  { to: '/app/settings/security', label: 'Security', icon: KeyRoundIcon },
  { to: '/app/settings/sessions', label: 'Devices', icon: MonitorSmartphoneIcon },
]

export function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-muted-foreground text-sm">Manage your profile, sign-in methods and devices.</p>
      </div>
      <nav className="bg-muted/60 inline-flex rounded-xl p-1">
        {tabs.map((t) => {
          const isActive = t.end ? pathname === t.to : pathname.startsWith(t.to)
          return (
            <Link
              key={t.to}
              href={t.to}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors [&_svg]:size-4',
                isActive && 'bg-background text-foreground shadow-sm',
              )}
            >
              <t.icon />
              {t.label}
            </Link>
          )
        })}
      </nav>
      {children}
    </div>
  )
}
