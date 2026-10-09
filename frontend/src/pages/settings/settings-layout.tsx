import { KeyRoundIcon, MonitorSmartphoneIcon, UserIcon } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/app/settings', label: 'Profile', icon: UserIcon, end: true },
  { to: '/app/settings/security', label: 'Security', icon: KeyRoundIcon },
  { to: '/app/settings/sessions', label: 'Devices', icon: MonitorSmartphoneIcon },
]

export function SettingsLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-muted-foreground text-sm">Manage your profile, sign-in methods and devices.</p>
      </div>
      <nav className="bg-muted/60 inline-flex rounded-xl p-1">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                'text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors [&_svg]:size-4',
                isActive && 'bg-background text-foreground shadow-sm',
              )
            }
          >
            <t.icon />
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
