import { KeyRoundIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { GoogleIcon } from '@/components/ui/brand/google-icon'
import { Button } from '@/components/ui/button'
import { Divider, SecondaryButton } from '../components/kc-ui'
import type { I18n } from '../i18n'
import type { KcContext } from '../KcContext'

export type PageId = KcContext['pageId']

export type PageProps<P extends PageId> = {
  kcContext: Extract<KcContext, { pageId: P }>
  i18n: I18n
}

/** Native radios styled as cards (Keycloak credential pickers). */
export function ChoiceCard({
  id,
  name,
  value,
  defaultChecked,
  icon,
  title,
  description,
}: {
  id: string
  name: string
  value: string
  defaultChecked?: boolean
  icon: ReactNode
  title: ReactNode
  description?: ReactNode
}) {
  return (
    <label
      htmlFor={id}
      className="has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-primary/20 hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors has-[:checked]:ring-3"
    >
      <input type="radio" id={id} name={name} value={value} defaultChecked={defaultChecked} className="sr-only" />
      <span className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4.5">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        {description && <span className="text-muted-foreground block truncate text-xs">{description}</span>}
      </span>
    </label>
  )
}

type Social = NonNullable<Extract<KcContext, { pageId: 'login.ftl' }>['social']>

/**
 * Identity providers (Google, …). Google is shown only when SUPERAPP_GOOGLE_LOGIN_ENABLED=true on the Keycloak
 * container, so the button never appears before real credentials are configured.
 */
export function SocialProviders({ kcContext, i18n }: { kcContext: KcContext; i18n: I18n }) {
  const social = 'social' in kcContext ? (kcContext.social as Social | undefined) : undefined
  const googleEnabled = kcContext.properties.SUPERAPP_GOOGLE_LOGIN_ENABLED === 'true'
  const providers = (social?.providers ?? []).filter((p) => p.alias !== 'google' || googleEnabled)
  if (providers.length === 0) return null

  return (
    <div id="kc-social-providers" className="space-y-3">
      {providers.map((p) => (
        <SecondaryButton key={p.alias} asChild className="gap-2.5 font-medium">
          <a id={`social-${p.alias}`} href={p.loginUrl}>
            {p.alias === 'google' ? <GoogleIcon className="size-4.5" /> : null}
            {p.alias === 'google' ? i18n.msg('continueWithGoogle') : p.displayName}
          </a>
        </SecondaryButton>
      ))}
      <Divider>{i18n.msg('orUseEmail')}</Divider>
    </div>
  )
}

/** Hidden forms + button used by Keycloak's WebAuthn/passkey scripts (ids are part of the contract). */
export function PasskeyConditionalUi({
  kcContext,
  i18n,
  buttonId,
  authenticators,
}: {
  kcContext: { url: { loginAction: string } }
  i18n: I18n
  buttonId: string
  authenticators?: { authenticators: { credentialId: string }[] }
}) {
  return (
    <>
      <WebauthnHiddenForm action={kcContext.url.loginAction} />
      {authenticators && authenticators.authenticators.length > 0 && (
        <form id="authn_select">
          {authenticators.authenticators.map((a) => (
            <input key={a.credentialId} type="hidden" name="authn_use_chk" readOnly value={a.credentialId} />
          ))}
        </form>
      )}
      <Button id={buttonId} type="button" variant="outline" size="lg" className="h-10 w-full gap-2 text-[0.95rem]">
        <KeyRoundIcon />
        {i18n.msg('passkey-doAuthenticate')}
      </Button>
    </>
  )
}

export function WebauthnHiddenForm({ action }: { action: string }) {
  return (
    <form id="webauth" action={action} method="post" className="hidden">
      <input type="hidden" id="clientDataJSON" name="clientDataJSON" />
      <input type="hidden" id="authenticatorData" name="authenticatorData" />
      <input type="hidden" id="signature" name="signature" />
      <input type="hidden" id="credentialId" name="credentialId" />
      <input type="hidden" id="userHandle" name="userHandle" />
      <input type="hidden" id="error" name="error" />
    </form>
  )
}

export function RegisterLink({ i18n, href }: { i18n: I18n; href: string }) {
  return (
    <span id="kc-registration">
      {i18n.msg('noAccount')}{' '}
      <a href={href} className="text-primary font-medium underline-offset-4 hover:underline">
        {i18n.msg('doRegister')}
      </a>
    </span>
  )
}
