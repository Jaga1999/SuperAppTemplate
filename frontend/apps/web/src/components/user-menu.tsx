import { ChevronsUpDownIcon, KeyRoundIcon, LogOutIcon, MonitorSmartphoneIcon, UserIcon } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@superapp/ui/components/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@superapp/ui/components/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@superapp/ui/components/sidebar'
import { auth } from '../lib/auth'
import { initials } from '../lib/format'
import { useMe } from '../lib/queries'

export function UserMenu() {
  const { data: me } = useMe()
  const navigate = useNavigate()
  if (!me) return null
  const name = me.displayName || me.email || 'Account'

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <Avatar className="size-8 rounded-lg">
                {me.pictureUrl && <AvatarImage src={me.pictureUrl} alt="" />}
                <AvatarFallback className="bg-primary/10 text-primary rounded-lg text-xs font-semibold">{initials(me.displayName, me.email)}</AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="text-muted-foreground truncate text-xs">{me.email}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="text-muted-foreground truncate text-xs">{me.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => navigate('/app/settings')}><UserIcon />Profile</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/app/settings/security')}><KeyRoundIcon />Security</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/app/settings/sessions')}><MonitorSmartphoneIcon />Devices</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => void auth.signOut()}><LogOutIcon />Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
