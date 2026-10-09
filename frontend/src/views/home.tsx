'use client'

import { ArrowRightIcon, LaptopIcon, ShieldCheckIcon, UserIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useMe } from '@/lib/queries'

const shortcuts: { to: Route; title: string; description: string; icon: typeof UserIcon }[] = [
  { to: '/app/settings', title: 'Profile', description: 'Your name, email and account.', icon: UserIcon },
  { to: '/app/settings/security', title: 'Security', description: 'Password, passkeys and two-step verification.', icon: ShieldCheckIcon },
  { to: '/app/settings/sessions', title: 'Sessions', description: 'Devices signed in to your account.', icon: LaptopIcon },
]

/** Signed-in start page. Replace it with your product's first screen. */
export function HomePage() {
  const { data: me } = useMe()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Welcome{me?.givenName ? `, ${me.givenName}` : ''}</h2>
        <p className="text-muted-foreground text-sm">You're signed in. Your product starts here.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map((s) => (
          <Card key={s.to}>
            <CardHeader>
              <s.icon className="text-primary mb-2 size-5" />
              <CardTitle>{s.title}</CardTitle>
              <CardDescription>{s.description}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild variant="outline" size="sm">
                <Link href={s.to}>
                  Open <ArrowRightIcon />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
