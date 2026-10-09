import { CrownIcon, HouseIcon, LayoutDashboardIcon, SettingsIcon, ShieldIcon } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { Logo } from '@/components/ui/brand/logo'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { ActionStatusToasts } from '../components/action-status-toasts'
import { ThemeToggle } from '../components/theme-toggle'
import { UserMenu } from '../components/user-menu'
import { useMe } from '../lib/queries'

const nav = [
  { to: '/app', label: 'Home', icon: HouseIcon, end: true },
  { to: '/app/settings', label: 'Settings', icon: SettingsIcon },
]

const titles: Record<string, string> = {
  '/app': 'Home',
  '/app/settings': 'Settings',
  '/app/settings/security': 'Settings',
  '/app/settings/sessions': 'Settings',
  '/app/admin': 'Admin',
}

export function AppShell() {
  const { data: me } = useMe()
  const { pathname } = useLocation()

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="px-3 pt-3">
          <NavLink to="/app" className="flex h-9 items-center group-data-[collapsible=icon]:justify-center">
            <Logo className="group-data-[collapsible=icon]:[&>span:last-child]:hidden" />
          </NavLink>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild tooltip={item.label} isActive={item.end ? pathname === item.to : pathname.startsWith(item.to)}>
                      <NavLink to={item.to} end={item.end}>
                        <item.icon />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {me?.admin && (
            <SidebarGroup>
              <SidebarGroupLabel>Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Admin" isActive={pathname.startsWith('/app/admin')}>
                      <NavLink to="/app/admin">
                        <ShieldIcon />
                        <span>Admin</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter>
          <UserMenu />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="bg-background/80 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 rounded-t-xl border-b px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
          <LayoutDashboardIcon className="text-muted-foreground size-4" />
          <h1 className="text-sm font-medium">{titles[pathname] ?? 'SuperApp'}</h1>
          {me?.premium && (
            <Badge variant="secondary" className="ml-1 gap-1">
              <CrownIcon className="size-3" /> Premium
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
      <ActionStatusToasts />
    </SidebarProvider>
  )
}
