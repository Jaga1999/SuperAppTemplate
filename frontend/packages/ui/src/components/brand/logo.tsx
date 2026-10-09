import { cn } from '@superapp/ui/lib/utils'

/** Brand mark + wordmark. Shared by the SPA and the Keycloak login theme. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'bg-brand-gradient inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] text-white shadow-sm ring-1 ring-white/20 ring-inset',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-[60%]" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.2 4.2L19 7" />
      </svg>
    </span>
  )
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={markClassName} />
      <span className="text-[1.05rem] font-semibold tracking-tight">SuperApp</span>
    </span>
  )
}
