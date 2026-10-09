import { Building2Icon, LinkIcon, MailIcon, ShieldAlertIcon, Trash2Icon, UserCheckIcon } from 'lucide-react'
import { type MouseEvent, type ReactNode, useRef, useState } from 'react'
import { Alert, AlertDescription } from '@superapp/ui/components/alert'
import { Field, Prose, SecondaryButton, SubmitButton, TextInput } from '../components/kc-ui'
import Template from '../Template'
import type { PageProps } from './shared'

function Hero({ icon, tone = 'primary' }: { icon: ReactNode; tone?: 'primary' | 'destructive' }) {
  return (
    <div
      className={`mb-1 flex size-12 items-center justify-center rounded-2xl [&_svg]:size-6 ${
        tone === 'destructive' ? 'bg-destructive/10 text-destructive' : 'bg-primary/8 text-primary'
      }`}
    >
      {icon}
    </div>
  )
}

/** login-idp-link-confirm.ftl — an account with this email already exists. */
export function LoginIdpLinkConfirm({ kcContext, i18n }: PageProps<'login-idp-link-confirm.ftl'>) {
  const { url, idpAlias } = kcContext
  const { msg } = i18n
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} headerNode={msg('confirmLinkIdpTitle')}>
      <form id="kc-register-form" action={url.loginAction} method="post" className="grid gap-2.5">
        <Hero icon={<LinkIcon />} />
        <SubmitButton name="submitAction" id="linkAccount" value="linkAccount">
          {msg('confirmLinkIdpContinue', idpAlias)}
        </SubmitButton>
        <SecondaryButton type="submit" name="submitAction" id="updateProfile" value="updateProfile">
          {msg('confirmLinkIdpReviewProfile')}
        </SecondaryButton>
      </form>
    </Template>
  )
}

/** login-idp-link-confirm-override.ftl */
export function LoginIdpLinkConfirmOverride({ kcContext, i18n }: PageProps<'login-idp-link-confirm-override.ftl'>) {
  const { url, idpDisplayName } = kcContext
  const { msg } = i18n
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} headerNode={msg('confirmOverrideIdpTitle')}>
      <form id="kc-register-form" action={url.loginAction} method="post" className="space-y-4">
        <Prose>
          <p>
            {msg('pageExpiredMsg1')}{' '}
            <a id="loginRestartLink" href={url.loginRestartFlowUrl}>
              {msg('doClickHere')}
            </a>
          </p>
        </Prose>
        <SubmitButton name="submitAction" id="confirmOverride" value="confirmOverride">
          {msg('confirmOverrideIdpContinue', idpDisplayName)}
        </SubmitButton>
      </form>
    </Template>
  )
}

/** login-idp-link-email.ftl — confirm linking via email. */
export function LoginIdpLinkEmail({ kcContext, i18n }: PageProps<'login-idp-link-email.ftl'>) {
  const { url, realm, brokerContext, idpAlias } = kcContext
  const { msg } = i18n
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} headerNode={msg('emailLinkIdpTitle', idpAlias)}>
      <div className="space-y-4">
        <Hero icon={<MailIcon />} />
        <Prose>
          <p id="instruction1">{msg('emailLinkIdp1', idpAlias, brokerContext.username, realm.displayName)}</p>
          <p id="instruction2">
            {msg('emailLinkIdp2')} <a href={url.loginAction}>{msg('doClickHere')}</a> {msg('emailLinkIdp3')}
          </p>
          <p id="instruction3">
            {msg('emailLinkIdp4')} <a href={url.loginAction}>{msg('doClickHere')}</a> {msg('emailLinkIdp5')}
          </p>
        </Prose>
      </div>
    </Template>
  )
}

/** link-idp-action.ftl — "Link your Google account" (application-initiated). */
export function LinkIdpAction({ kcContext, i18n }: PageProps<'link-idp-action.ftl'>) {
  const { idpDisplayName, url } = kcContext
  const { msg, msgStr } = i18n
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} displayMessage={false} headerNode={msg('linkIdpActionTitle', idpDisplayName)}>
      <div className="space-y-5">
        <Hero icon={<LinkIcon />} />
        <Prose>
          <p id="kc-link-text">{msg('linkIdpActionMessage', idpDisplayName)}</p>
        </Prose>
        <form action={url.loginAction} method="post" className="grid gap-2.5 sm:grid-cols-2">
          <SecondaryButton type="submit" name="cancel-aia" id="kc-cancel" value="true">{msgStr('doCancel')}</SecondaryButton>
          <SubmitButton name="continue" id="kc-continue">{msgStr('doContinue')}</SubmitButton>
        </form>
      </div>
    </Template>
  )
}

/** delete-credential.ftl — confirm removing an authenticator app / passkey / security key. */
export function DeleteCredential({ kcContext, i18n }: PageProps<'delete-credential.ftl'>) {
  const { url, credentialLabel } = kcContext
  const { msg, msgStr } = i18n
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} displayMessage={false} headerNode={msg('deleteCredentialTitle', credentialLabel)}>
      <div className="space-y-5">
        <Hero icon={<Trash2Icon />} tone="destructive" />
        <Prose>
          <p id="kc-delete-text">{msg('deleteCredentialMessage', credentialLabel)}</p>
        </Prose>
        <form action={url.loginAction} method="POST" className="grid gap-2.5 sm:grid-cols-2">
          <SecondaryButton type="submit" name="cancel-aia" value="true" id="kc-decline">{msgStr('doCancel')}</SecondaryButton>
          <SubmitButton name="accept" id="kc-accept" variant="destructive" className="bg-destructive hover:bg-destructive/90 text-white">
            {msgStr('doConfirmDelete')}
          </SubmitButton>
        </form>
      </div>
    </Template>
  )
}

/** delete-account-confirm.ftl — irreversible account deletion. */
export function DeleteAccountConfirm({ kcContext, i18n }: PageProps<'delete-account-confirm.ftl'>) {
  const { url, triggered_from_aia } = kcContext
  const { msg, msgStr } = i18n
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} headerNode={msg('deleteAccountConfirm')}>
      <form action={url.loginAction} method="post" className="space-y-5">
        <Hero icon={<ShieldAlertIcon />} tone="destructive" />
        <Alert className="border-destructive/30 bg-destructive/8">
          <ShieldAlertIcon className="text-destructive" />
          <AlertDescription className="text-foreground font-medium">{msg('irreversibleAction')}</AlertDescription>
        </Alert>
        <Prose>
          <p>{msg('deletingImplies')}</p>
          <ul className="list-inside list-disc space-y-1">
            <li>{msg('loggingOutImmediately')}</li>
            <li>{msg('errasingData')}</li>
          </ul>
          <p className="text-foreground font-medium">{msg('finalDeletionConfirmation')}</p>
        </Prose>
        <div id="kc-form-buttons" className="grid gap-2.5 sm:grid-cols-2">
          {triggered_from_aia && (
            <SecondaryButton type="submit" name="cancel-aia" value="true">
              {msgStr('doCancel')}
            </SecondaryButton>
          )}
          <SubmitButton variant="destructive" className="bg-destructive hover:bg-destructive/90 text-white sm:col-start-2">
            {msgStr('doConfirmDelete')}
          </SubmitButton>
        </div>
      </form>
    </Template>
  )
}

/** login-x509-info.ftl — client certificate sign-in. */
export function LoginX509Info({ kcContext, i18n }: PageProps<'login-x509-info.ftl'>) {
  const { url, x509 } = kcContext
  const { msg, msgStr } = i18n
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} headerNode={msg('doLogIn')}>
      <form id="kc-x509-login-info" action={url.loginAction} method="post" className="space-y-4">
        <div className="bg-muted/40 space-y-2 rounded-xl border p-4 text-sm">
          <p className="text-muted-foreground text-xs font-medium">{msg('clientCertificate')}</p>
          <p id="certificate_subjectDN" className="font-mono break-all">{x509.formData.subjectDN ?? msg('noCertificate')}</p>
          {x509.formData.isUserEnabled && (
            <>
              <p className="text-muted-foreground pt-2 text-xs font-medium">{msg('doX509Login')}</p>
              <p id="username" className="font-medium">{x509.formData.username}</p>
            </>
          )}
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {x509.formData.isUserEnabled && (
            <SecondaryButton type="submit" name="cancel" id="kc-cancel">{msgStr('doIgnore')}</SecondaryButton>
          )}
          <SubmitButton name="login" id="kc-login" className="sm:col-start-2">{msgStr('doContinue')}</SubmitButton>
        </div>
      </form>
    </Template>
  )
}

/** login-oauth-grant.ftl — consent screen (unused by first-party clients, styled for completeness). */
export function LoginOauthGrant({ kcContext, i18n }: PageProps<'login-oauth-grant.ftl'>) {
  const { url, oauth, client } = kcContext
  const { msg, msgStr, advancedMsg, advancedMsgStr } = i18n
  const clientName = client.name ? advancedMsgStr(client.name) : client.clientId
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} headerNode={msg('oauthGrantTitle', clientName)}>
      <div id="kc-oauth" className="space-y-5">
        <Hero icon={<UserCheckIcon />} />
        <div className="space-y-2">
          <p className="text-sm font-medium">{msg('oauthGrantRequest')}</p>
          <ul className="space-y-1.5">
            {oauth.clientScopesRequested.map((scope) => (
              <li key={scope.consentScreenText} className="bg-muted/40 rounded-lg border px-3 py-2 text-sm">
                {advancedMsg(scope.consentScreenText)}
                {scope.dynamicScopeParameter && (
                  <>
                    : <b>{scope.dynamicScopeParameter}</b>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
        {(client.attributes.tosUri || client.attributes.policyUri) && (
          <p className="text-muted-foreground text-xs">
            {msg('oauthGrantInformation', clientName)}{' '}
            {client.attributes.tosUri && (
              <a href={client.attributes.tosUri} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                {msg('oauthGrantTos')}
              </a>
            )}{' '}
            {client.attributes.policyUri && (
              <a href={client.attributes.policyUri} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                {msg('oauthGrantPolicy')}
              </a>
            )}
          </p>
        )}
        <form action={url.oauthAction} method="POST" className="grid gap-2.5 sm:grid-cols-2">
          <input type="hidden" name="code" value={oauth.code} />
          <SecondaryButton type="submit" name="cancel" id="kc-cancel">{msgStr('doNo')}</SecondaryButton>
          <SubmitButton name="accept" id="kc-login">{msgStr('doYes')}</SubmitButton>
        </form>
      </div>
    </Template>
  )
}

/** login-oauth2-device-verify-user-code.ftl — device flow (TVs, CLIs). */
export function LoginOauth2DeviceVerifyUserCode({ kcContext, i18n }: PageProps<'login-oauth2-device-verify-user-code.ftl'>) {
  const { url } = kcContext
  const { msg, msgStr } = i18n
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} headerNode={msg('oauth2DeviceVerificationTitle')}>
      <form id="kc-user-verify-device-user-code-form" action={url.oauth2DeviceVerificationAction} method="post" className="space-y-4">
        <Field label={msg('verifyOAuth2DeviceUserCode')} htmlFor="device-user-code">
          <TextInput id="device-user-code" name="device_user_code" autoComplete="off" autoFocus className="text-center font-mono text-lg tracking-[0.3em] uppercase" />
        </Field>
        <SubmitButton>{msgStr('doSubmit')}</SubmitButton>
      </form>
    </Template>
  )
}

/** select-organization.ftl */
export function SelectOrganization({ kcContext, i18n }: PageProps<'select-organization.ftl'>) {
  const { url, user } = kcContext
  const { msg } = i18n
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const choose = (alias: string) => (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (!inputRef.current || !formRef.current) return
    inputRef.current.value = alias
    setSubmitting(true)
    formRef.current.requestSubmit()
  }
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} headerNode={msg('organization.select')}>
      <form ref={formRef} action={url.loginAction} method="post" className="grid gap-2">
        {(user.organizations ?? []).map(({ alias, name }) => (
          <button
            key={alias}
            id={`organization-${alias}`}
            type="button"
            disabled={submitting}
            onClick={choose(alias)}
            className="hover:bg-muted/60 flex items-center gap-3 rounded-xl border p-3.5 text-left text-sm font-medium transition-colors disabled:opacity-60"
          >
            <span className="bg-primary/8 text-primary flex size-9 items-center justify-center rounded-lg">
              <Building2Icon className="size-4.5" />
            </span>
            {name ?? alias}
          </button>
        ))}
        <input ref={inputRef} type="hidden" name="kc.org" />
      </form>
    </Template>
  )
}
