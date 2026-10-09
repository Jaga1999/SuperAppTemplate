import { RotateCcwIcon } from 'lucide-react'
import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Logo } from '@superapp/ui/components/brand/logo'
import { Button } from '@superapp/ui/components/button'
import { NotFoundPage } from './not-found'

export function RouteError() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 px-5 text-center">
      <Logo />
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground max-w-sm text-sm">An unexpected error occurred. Reloading usually fixes it.</p>
      </div>
      <Button onClick={() => window.location.reload()}><RotateCcwIcon /> Reload</Button>
    </div>
  )
}
