import { ArrowLeftIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Logo } from '@superapp/ui/components/brand/logo'
import { Button } from '@superapp/ui/components/button'

export function NotFoundPage() {
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 px-5 text-center">
      <Logo />
      <div className="space-y-2">
        <p className="text-brand-gradient text-7xl font-semibold tracking-tight">404</p>
        <h1 className="text-xl font-semibold">This page doesn't exist</h1>
        <p className="text-muted-foreground text-sm">The link may be broken, or the page may have moved.</p>
      </div>
      <Button asChild variant="outline">
        <Link to="/"><ArrowLeftIcon /> Back home</Link>
      </Button>
    </div>
  )
}
