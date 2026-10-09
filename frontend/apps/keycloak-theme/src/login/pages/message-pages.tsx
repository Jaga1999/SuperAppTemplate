import { kcSanitize } from 'keycloakify/lib/kcSanitize'
import { ArrowRightIcon, CircleAlertIcon, ClockIcon, ExternalLinkIcon, InfoIcon, LogOutIcon, MailCheckIcon, ScrollTextIcon, ShieldCheckIcon } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { Badge } from '@superapp/ui/components/badge'
import { Button } from '@superapp/ui/components/button'
import { CheckboxField, Prose, SecondaryButton, SubmitButton } from '../components/kc-ui'
import type { LegalDocumentView } from '../KcContext'
import Template from '../Template'
import type { PageProps } from './shared'

function Hero({ icon, tone = 'primary' }: { icon: ReactNode; tone?: 'primary' | 'destructive' }) {
  return (
    <div
      className={
        tone === 'destructive'
          ? 'bg-destructive/10 text-destructive mb-1 flex size-12 items-center justify-center rounded-2xl [&_svg]:size-6'
          : 'bg-primary/8 text-primary mb-1 flex size-12 items-center justify-center rounded-2xl [&_svg]:size-6'
      }
    >
      {icon}
    </div>
  )
}

function LinkButton({ href, children, variant = 'default' }: { href: string; children: ReactNode; variant?: 'default' | 'outline' }) {
  return (
    <Button asChild size="lg" variant={variant} className="h-10 w-full text-[0.95rem] font-semibold">
      <a href={href}>
        {children}
        {variant === 'default' && <ArrowRightIcon />}
      </a>
    </Button>
  )
}

/** info.ftl — confirmations ("Your account has been updated", required-action summaries, links). */
export function Info({ kcContext, i18n }: PageProps<'info.ftl'>) {
  const { messageHeader, message, requiredActions, skipLink, pageRedirectUri, actionUri, client } = kcContext
  const { advancedMsgStr, msg } = i18n
  let html = message.summary?.trim() ?? ''
  if (requiredActions) {
    html += ` <b>${requiredActions.map((a) => advancedMsgStr(`requiredAction.${a}`)).join(', ')}</b>`
  }
  const target = skipLink ? undefined : (pageRedirectUri ?? actionUri ?? client.baseUrl)
  const label = actionUri && !pageRedirectUri ? msg('proceedWithAction') : msg('backToApplication')
  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={false}
      displayMessage={false}
      headerNode={<span dangerouslySetInnerHTML={{ __html: kcSanitize(messageHeader ? advancedMsgStr(messageHeader) : message.summary) }} />}
    >
      <div id="kc-info-message" className="space-y-6">
        <Hero icon={<InfoIcon />} />
        <Prose>
          <p dangerouslySetInnerHTML={{ __html: kcSanitize(html) }} />
        </Prose>
        {target && <LinkButton href={target}>{label}</LinkButton>}
      </div>
    </Template>
  )
}

/** error.ftl */
export function ErrorPage({ kcContext, i18n }: PageProps<'error.ftl'>) {
  const { message, client, skipLink } = kcContext
  const { msg } = i18n
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} displayMessage={false} headerNode={msg('errorTitle')}>
      <div id="kc-error-message" className="space-y-6">
        <Hero icon={<CircleAlertIcon />} tone="destructive" />
        <Prose>
          <p dangerouslySetInnerHTML={{ __html: kcSanitize(message.summary) }} />
        </Prose>
        {!skipLink && client?.baseUrl && (
          <LinkButton href={client.baseUrl}>
            <span id="backToApplication">{msg('backToApplication')}</span>
          </LinkButton>
        )}
      </div>
    </Template>
  )
}

/** login-verify-email.ftl — "check your inbox". */
export function LoginVerifyEmail({ kcContext, i18n }: PageProps<'login-verify-email.ftl'>) {
  const { url, user } = kcContext
  const { msg } = i18n
  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={false}
      headerNode={msg('emailVerifyTitle')}
      displayInfo
      infoNode={
        <p>
          {msg('emailVerifyInstruction2')}{' '}
          <a href={url.loginAction} className="text-primary font-medium hover:underline">
            {msg('doClickHere')}
          </a>{' '}
          {msg('emailVerifyInstruction3')}
        </p>
      }
    >
      <div className="space-y-4">
        <Hero icon={<MailCheckIcon />} />
        <Prose>
          <p>{msg('emailVerifyInstruction1', user?.email ?? '')}</p>
        </Prose>
      </div>
    </Template>
  )
}

/** login-page-expired.ftl */
export function LoginPageExpired({ kcContext, i18n }: PageProps<'login-page-expired.ftl'>) {
  const { url } = kcContext
  const { msg } = i18n
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} headerNode={msg('pageExpiredTitle')}>
      <div className="space-y-5">
        <Hero icon={<ClockIcon />} />
        <Prose>
          <p>This page timed out to keep your account safe. Pick up where you left off, or start over.</p>
        </Prose>
        <div className="grid gap-2.5">
          <LinkButton href={url.loginAction}>
            <span id="loginContinueLink">{msg('doContinue')}</span>
          </LinkButton>
          <LinkButton href={url.loginRestartFlowUrl} variant="outline">
            <span id="loginRestartLink">{msg('doTryAgain')}</span>
          </LinkButton>
        </div>
      </div>
    </Template>
  )
}

/** logout-confirm.ftl */
export function LogoutConfirm({ kcContext, i18n }: PageProps<'logout-confirm.ftl'>) {
  const { url, client, logoutConfirm } = kcContext
  const { msg, msgStr } = i18n
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} headerNode={msg('logoutConfirmTitle')}>
      <div id="kc-logout-confirm" className="space-y-5">
        <Hero icon={<LogOutIcon />} />
        <Prose>
          <p>{msg('logoutConfirmHeader')}</p>
        </Prose>
        <form action={url.logoutConfirmAction} method="POST" className="grid gap-2.5">
          <input type="hidden" name="session_code" value={logoutConfirm.code} />
          <SubmitButton name="confirmLogout" id="kc-logout">{msgStr('doLogout')}</SubmitButton>
          {!logoutConfirm.skipLink && client.baseUrl && (
            <SecondaryButton asChild>
              <a href={client.baseUrl}>{msg('backToApplication')}</a>
            </SecondaryButton>
          )}
        </form>
      </div>
    </Template>
  )
}

/** terms.ftl — required action for new accounts. */
export function Terms({ kcContext, i18n }: PageProps<'terms.ftl'>) {
  const { url } = kcContext
  const { msg, msgStr } = i18n
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} displayMessage={false} headerNode={msg('termsTitle')}>
      <div className="space-y-5">
        <Hero icon={<ScrollTextIcon />} />
        <div id="kc-terms-text" className="bg-muted/40 text-muted-foreground max-h-72 space-y-3 overflow-y-auto rounded-xl border p-4 text-sm leading-relaxed">
          {/* termsText is HTML (paragraphs, links); kcSanitize strips anything unsafe. */}
          <div dangerouslySetInnerHTML={{ __html: kcSanitize(msgStr('termsText')) }} />
        </div>
        <form action={url.loginAction} method="POST" className="grid gap-2.5 sm:grid-cols-2">
          <SecondaryButton type="submit" name="cancel" id="kc-decline">{msgStr('doDecline')}</SecondaryButton>
          <SubmitButton name="accept" id="kc-accept">{msgStr('doAccept')}</SubmitButton>
        </form>
      </div>
    </Template>
  )
}

/**
 * legal-consent.ftl — custom page of the superapp-legal-consent required action. Shown once per document version:
 * on first sign-in, and again only when the Terms or Privacy Policy version changes.
 */
export function LegalConsent({ kcContext, i18n }: PageProps<'legal-consent.ftl'>) {
  const { url, legalTerms, legalPrivacy } = kcContext
  const { msg, msgStr } = i18n
  const [terms, setTerms] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const updated = legalTerms.updated || legalPrivacy.updated

  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={false}
      displayMessage
      headerNode={msg(updated ? 'legalConsentUpdatedTitle' : 'legalConsentTitle')}
      subtitleNode={msg(updated ? 'legalConsentUpdatedSubtitle' : 'legalConsentSubtitle')}
    >
      <form action={url.loginAction} method="POST" className="space-y-5">
        <div className="space-y-3">
          <LegalDocumentCard icon={<ScrollTextIcon />} doc={legalTerms} href="/legal/terms" i18n={i18n} />
          <LegalDocumentCard icon={<ShieldCheckIcon />} doc={legalPrivacy} href="/legal/privacy" i18n={i18n} />
        </div>
        <div className="space-y-3">
          <CheckboxField id="acceptTerms" name="acceptTerms" label={msg('legalAcceptTerms')} checked={terms} onCheckedChange={setTerms} />
          <CheckboxField id="acceptPrivacy" name="acceptPrivacy" label={msg('legalAcceptPrivacy')} checked={privacy} onCheckedChange={setPrivacy} />
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <SecondaryButton type="submit" name="cancel" id="kc-decline" formNoValidate>{msgStr('doDecline')}</SecondaryButton>
          <SubmitButton name="accept" id="kc-accept" disabled={!terms || !privacy}>{msgStr('doAccept')}</SubmitButton>
        </div>
        <p className="text-muted-foreground text-center text-xs">{msg('legalDeclineHint')}</p>
      </form>
    </Template>
  )
}

function LegalDocumentCard({ icon, doc, href, i18n }: { icon: ReactNode; doc: LegalDocumentView; href: string; i18n: PageProps<'legal-consent.ftl'>['i18n'] }) {
  const { msg } = i18n
  return (
    <div className="bg-muted/40 flex gap-3 rounded-xl border p-4">
      <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4.5">{icon}</div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{doc.title}</p>
          {doc.updated && <Badge variant="secondary">{msg('legalUpdatedBadge')}</Badge>}
        </div>
        {doc.summary && <p className="text-muted-foreground text-sm">{doc.summary}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {doc.effective && <span className="text-muted-foreground text-xs">{msg('legalEffective', doc.effective)}</span>}
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
          >
            {msg('legalRead')} <ExternalLinkIcon className="size-3.5" />
          </a>
        </div>
      </div>
    </div>
  )
}

/** code.ftl — out-of-band authorization code display. */
export function Code({ kcContext, i18n }: PageProps<'code.ftl'>) {
  const { code } = kcContext
  const { msg } = i18n
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} headerNode={code.success ? msg('codeSuccessTitle') : msg('codeErrorTitle', code.error)}>
      <div id="kc-code" className="space-y-3">
        {code.success ? (
          <>
            <p className="text-muted-foreground text-sm">{msg('copyCodeInstruction')}</p>
            <input id="code" readOnly defaultValue={code.code} className="bg-muted w-full rounded-lg border px-3 py-2 font-mono text-sm" />
          </>
        ) : (
          code.error && <p id="error" className="text-destructive text-sm" dangerouslySetInnerHTML={{ __html: kcSanitize(code.error) }} />
        )}
      </div>
    </Template>
  )
}

/** frontchannel-logout.ftl — logs out of each client via hidden iframes, then continues. */
export function FrontchannelLogout({ kcContext, i18n }: PageProps<'frontchannel-logout.ftl'>) {
  const { logout } = kcContext
  const { msg, msgStr } = i18n
  const [loaded, setLoaded] = useState(0)
  useEffect(() => {
    if (logout.logoutRedirectUri && loaded === logout.clients.length) {
      window.location.replace(logout.logoutRedirectUri)
    }
  }, [loaded, logout.clients.length, logout.logoutRedirectUri])
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} documentTitle={msgStr('frontchannel-logout.title')} headerNode={msg('frontchannel-logout.title')}>
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">{msg('frontchannel-logout.message')}</p>
        <ul className="space-y-1 text-sm">
          {logout.clients.map((c) => (
            <li key={c.name}>
              {c.name}
              <iframe title={c.name} src={c.frontChannelLogoutUrl} className="hidden" onLoad={() => setLoaded((n) => n + 1)} />
            </li>
          ))}
        </ul>
        {logout.logoutRedirectUri !== undefined && (
          <LinkButton href={logout.logoutRedirectUri}>
            <span id="continue">{msg('doContinue')}</span>
          </LinkButton>
        )}
      </div>
    </Template>
  )
}

/** saml-post-form.ftl — auto-submits a SAML binding form. */
export function SamlPostForm({ kcContext, i18n }: PageProps<'saml-post-form.ftl'>) {
  const { samlPost } = kcContext
  const { msg, msgStr } = i18n
  const [form, setForm] = useState<HTMLFormElement | null>(null)
  useEffect(() => {
    if (form && samlPost.url !== '#') form.requestSubmit()
  }, [form, samlPost.url])
  return (
    <Template kcContext={kcContext} i18n={i18n} doUseDefaultCss={false} headerNode={msg('saml.post-form.title')}>
      <p className="text-muted-foreground text-sm">{msg('saml.post-form.message')}</p>
      <form name="saml-post-binding" method="post" action={samlPost.url} ref={setForm}>
        {samlPost.SAMLRequest && <input type="hidden" name="SAMLRequest" value={samlPost.SAMLRequest} />}
        {samlPost.SAMLResponse && <input type="hidden" name="SAMLResponse" value={samlPost.SAMLResponse} />}
        {samlPost.relayState && <input type="hidden" name="RelayState" value={samlPost.relayState} />}
        <noscript>
          <p>{msg('saml.post-form.js-disabled')}</p>
          <input type="submit" value={msgStr('doContinue')} />
        </noscript>
      </form>
    </Template>
  )
}
