'use client'

import { format, parseISO } from 'date-fns'
import { BadgeCheckIcon, MailIcon, PencilIcon, ShieldIcon, TriangleAlertIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item'
import { auth } from '@/lib/auth'
import { initials } from '@/lib/format'
import { useMe } from '@/lib/queries'

export function ProfileSettings() {
  const { data: me } = useMe()
  if (!me) return null

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar className="size-16 rounded-2xl">
            {me.pictureUrl && <AvatarImage src={me.pictureUrl} alt="" />}
            <AvatarFallback className="bg-brand-gradient rounded-2xl text-lg font-semibold text-white">{initials(me.displayName, me.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-lg font-semibold">{me.displayName || me.email}</p>
            <p className="text-muted-foreground flex items-center gap-1.5 truncate text-sm">
              <MailIcon className="size-3.5" /> {me.email}
              {me.emailVerified && <BadgeCheckIcon className="text-primary size-4" aria-label="Verified" />}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {me.roles.filter((r) => ['user', 'admin'].includes(r)).map((r) => (
                <Badge key={r} variant={r === 'user' ? 'outline' : 'secondary'} className="gap-1 capitalize">
                  {r === 'admin' && <ShieldIcon className="size-3" />}
                  {r}
                </Badge>
              ))}
            </div>
          </div>
          {me.memberSince && <p className="text-muted-foreground text-xs">Member since {format(parseISO(me.memberSince), 'MMMM yyyy')}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
          <CardDescription>Edited on our secure sign-in pages, then you're sent right back here.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Item variant="outline">
            <ItemContent>
              <ItemTitle>Name</ItemTitle>
              <ItemDescription>{[me.givenName, me.familyName].filter(Boolean).join(' ') || 'Not set'}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button variant="outline" size="sm" onClick={() => auth.runAction('UPDATE_PROFILE')}><PencilIcon />Edit</Button>
            </ItemActions>
          </Item>
          <Item variant="outline">
            <ItemContent>
              <ItemTitle>Email</ItemTitle>
              <ItemDescription>{me.email} · we'll ask you to confirm the new address</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button variant="outline" size="sm" onClick={() => auth.runAction('UPDATE_EMAIL')}><PencilIcon />Change</Button>
            </ItemActions>
          </Item>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2"><TriangleAlertIcon className="size-4" /> Danger zone</CardTitle>
          <CardDescription>Deleting your account removes your profile and all your data. This cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => auth.runAction('delete_account', '/')}>Delete account</Button>
        </CardContent>
      </Card>
    </div>
  )
}
