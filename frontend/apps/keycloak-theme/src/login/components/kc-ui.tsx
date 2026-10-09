import { EyeIcon, EyeOffIcon, InfoIcon, CircleAlertIcon, CircleCheckIcon, TriangleAlertIcon } from 'lucide-react'
import { kcSanitize } from 'keycloakify/lib/kcSanitize'
import { useIsPasswordRevealed } from 'keycloakify/tools/useIsPasswordRevealed'
import type { ComponentProps, ReactNode } from 'react'
import { Alert, AlertDescription } from '@superapp/ui/components/alert'
import { Button } from '@superapp/ui/components/button'
import { Checkbox } from '@superapp/ui/components/checkbox'
import { Input } from '@superapp/ui/components/input'
import { Label } from '@superapp/ui/components/label'
import { cn } from '@superapp/ui/lib/utils'
import type { I18n } from '../i18n'

/**
 * Building blocks for every Keycloak page. They render native form controls (Keycloak expects plain form
 * posts with specific field names) styled with the same shadcn primitives as the SPA.
 */

export function Field({
  label,
  htmlFor,
  error,
  hint,
  aside,
  children,
}: {
  label?: ReactNode
  htmlFor?: string
  error?: string
  hint?: ReactNode
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="grid gap-2">
      {(label || aside) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <Label htmlFor={htmlFor} className="text-sm font-medium">
              {label}
            </Label>
          )}
          {aside}
        </div>
      )}
      {children}
      {hint && !error && <p className="text-muted-foreground text-xs leading-relaxed">{hint}</p>}
      <FieldError id={htmlFor ? `input-error-${htmlFor}` : undefined} html={error} />
    </div>
  )
}

export function FieldError({ html, id }: { html?: string; id?: string }) {
  if (!html) return null
  return (
    <p
      id={id}
      aria-live="polite"
      className="text-destructive text-xs leading-relaxed font-medium"
      // Keycloak messages may contain markup; kcSanitize strips anything unsafe.
      dangerouslySetInnerHTML={{ __html: kcSanitize(html) }}
    />
  )
}

export function TextInput({ invalid, className, ...props }: ComponentProps<'input'> & { invalid?: boolean }) {
  return <Input aria-invalid={invalid || undefined} className={cn('h-10 text-[0.95rem]', className)} {...props} />
}

export function PasswordInput({
  id,
  i18n,
  invalid,
  ...props
}: ComponentProps<'input'> & { id: string; i18n: I18n; invalid?: boolean }) {
  const { isPasswordRevealed, toggleIsPasswordRevealed } = useIsPasswordRevealed({ passwordInputId: id })
  return (
    <div className="relative">
      <TextInput id={id} type="password" invalid={invalid} className="pr-10" {...props} />
      <button
        type="button"
        onClick={toggleIsPasswordRevealed}
        aria-label={i18n.msgStr(isPasswordRevealed ? 'hidePassword' : 'showPassword')}
        aria-controls={id}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg outline-none focus-visible:ring-3"
      >
        {isPasswordRevealed ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
      </button>
    </div>
  )
}

export function SubmitButton({ children, className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button type="submit" size="lg" className={cn('h-10 w-full text-[0.95rem] font-semibold', className)} {...props}>
      {children}
    </Button>
  )
}

export function SecondaryButton({ children, className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button variant="outline" size="lg" className={cn('h-10 w-full text-[0.95rem]', className)} {...props}>
      {children}
    </Button>
  )
}

/** Primary submit + optional "Cancel" for application-initiated actions (Keycloak expects name=cancel-aia). */
export function ActionButtons({
  i18n,
  submitLabel,
  isAppInitiatedAction,
  disabled,
  submitId,
}: {
  i18n: I18n
  submitLabel?: ReactNode
  isAppInitiatedAction?: boolean
  disabled?: boolean
  submitId?: string
}) {
  return (
    <div className={cn('grid gap-2.5 pt-1', isAppInitiatedAction && 'sm:grid-cols-2 sm:[&>*:first-child]:order-2')}>
      <SubmitButton id={submitId} disabled={disabled}>
        {submitLabel ?? i18n.msg('doSubmit')}
      </SubmitButton>
      {isAppInitiatedAction && (
        <SecondaryButton type="submit" name="cancel-aia" value="true" formNoValidate>
          {i18n.msg('doCancel')}
        </SecondaryButton>
      )}
    </div>
  )
}

/** Keycloak's "sign out of other devices" option (posts logout-sessions=on). */
export function LogoutOtherSessions({ i18n }: { i18n: I18n }) {
  return <CheckboxField id="logout-sessions" name="logout-sessions" label={i18n.msg('logoutOtherSessions')} defaultChecked />
}

export function CheckboxField({
  id,
  name,
  label,
  defaultChecked,
  checked,
  onCheckedChange,
  invalid,
}: {
  id: string
  name: string
  label: ReactNode
  defaultChecked?: boolean
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  invalid?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Checkbox
        id={id}
        name={name}
        value="on"
        defaultChecked={defaultChecked}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange?.(v === true)}
        aria-invalid={invalid || undefined}
        className="mt-0.5"
      />
      <Label htmlFor={id} className="text-muted-foreground text-sm leading-snug font-normal">
        {label}
      </Label>
    </div>
  )
}

export function Divider({ children }: { children?: ReactNode }) {
  return (
    <div className="relative my-1 flex items-center gap-3">
      <span className="bg-border h-px flex-1" />
      {children && <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{children}</span>}
      <span className="bg-border h-px flex-1" />
    </div>
  )
}

export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('text-muted-foreground space-y-3 text-sm leading-relaxed [&_a]:text-primary [&_a]:font-medium [&_a]:underline-offset-4 hover:[&_a]:underline [&_b]:text-foreground [&_strong]:text-foreground', className)}>{children}</div>
}

export function TextLink({ className, ...props }: ComponentProps<'a'>) {
  return <a className={cn('text-primary text-sm font-medium underline-offset-4 hover:underline', className)} {...props} />
}

const messageStyles = {
  success: { icon: CircleCheckIcon, className: 'border-success/30 bg-success/8 text-foreground [&>svg]:text-success' },
  warning: { icon: TriangleAlertIcon, className: 'border-warning/40 bg-warning/10 text-foreground [&>svg]:text-warning' },
  error: { icon: CircleAlertIcon, className: 'border-destructive/30 bg-destructive/8 text-foreground [&>svg]:text-destructive' },
  info: { icon: InfoIcon, className: 'border-primary/25 bg-primary/6 text-foreground [&>svg]:text-primary' },
} as const

export function KcMessage({ type, summary }: { type: keyof typeof messageStyles; summary: string }) {
  const { icon: Icon, className } = messageStyles[type]
  return (
    <Alert className={cn('rounded-lg', className)} role={type === 'error' ? 'alert' : 'status'}>
      <Icon />
      <AlertDescription className="text-foreground/90 text-sm" dangerouslySetInnerHTML={{ __html: kcSanitize(summary) }} />
    </Alert>
  )
}
