'use client'

import { RotateCcwIcon } from 'lucide-react'
import { Logo } from '@/components/ui/brand/logo'
import { Button } from '@/components/ui/button'

/** Last-resort boundary for unexpected render errors. Details stay in the browser console, never on screen. */
export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 px-5 text-center">
      <Logo />
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground max-w-sm text-sm">An unexpected error occurred. Trying again usually fixes it.</p>
      </div>
      <Button onClick={reset}>
        <RotateCcwIcon /> Try again
      </Button>
    </div>
  )
}
