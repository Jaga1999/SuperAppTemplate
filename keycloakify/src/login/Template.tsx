import { useInitialize } from 'keycloakify/login/Template.useInitialize'
import type { TemplateProps } from 'keycloakify/login/TemplateProps'
import { ArrowLeftIcon, CheckIcon, LockKeyholeIcon, RotateCcwIcon } from 'lucide-react'
import { lazy, type ReactNode, Suspense, useEffect } from 'react'
import { Logo, LogoMark } from '@/components/ui/brand/logo'
import { Button } from '@/components/ui/button'
import { KcMessage, TextLink } from './components/kc-ui'
import type { I18n } from './i18n'
import type { KcContext } from './KcContext'

// Only realms with several languages pay for the dropdown (see language-menu.tsx).
const LanguageMenu = lazy(() => import('./components/language-menu'))

const CURRENT_YEAR = new Date().getFullYear()

export type SuperAppTemplateProps = TemplateProps<KcContext, I18n> & {
  /** One line under the title. */
  subtitleNode?: ReactNode
}

/** Follows the OS color scheme (the SPA uses the same tokens; the theme has no toggle of its own). */
function useSystemColorScheme() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => document.documentElement.classList.toggle('dark', media.matches)
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])
}

/**
 * Shell of every Keycloak page: brand panel (desktop) + focused form column.
 * Renders Keycloak's global message, the "attempted username" chip, "try another way", social providers and
 * the info/footer node, exactly where users expect them.
 */
export default function Template(props: SuperAppTemplateProps) {
  const {
    displayInfo = false,
    displayMessage = true,
    displayRequiredFields = false,
    headerNode,
    subtitleNode,
    socialProvidersNode = null,
    infoNode = null,
    documentTitle,
    kcContext,
    i18n,
    doUseDefaultCss,
    children,
  } = props

  const { msg, msgStr, enabledLanguages } = i18n
  const { realm, auth, url, message, isAppInitiatedAction, client } = kcContext

  useSystemColorScheme()

  useEffect(() => {
    document.title = documentTitle ?? `${typeof headerNode === 'string' ? `${headerNode} · ` : ''}${realm.displayName || 'SuperApp'}`
  }, [documentTitle, headerNode, realm.displayName])

  const { isReadyToRender } = useInitialize({ kcContext, doUseDefaultCss })
  if (!isReadyToRender) return null

  const showAttemptedUsername = auth?.showUsername && !auth.showResetCredentials
  const backUrl = client && 'baseUrl' in client && client.baseUrl ? client.baseUrl : undefined

  return (
    <div className="bg-background text-foreground grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* ── Brand panel ─────────────────────────────────────────────── */}
      <aside className="bg-brand-gradient relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.12] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 size-[28rem] rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center gap-2.5 text-white">
          <LogoMark className="bg-white/15 shadow-none ring-white/30" />
          <span className="text-lg font-semibold tracking-tight">SuperApp</span>
        </div>
        <div className="relative max-w-md space-y-6 text-white">
          <h2 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance xl:text-5xl">{msg('brandHeadline')}</h2>
          <p className="text-base leading-relaxed text-white/75">{msg('brandSubline')}</p>
          <ul className="space-y-3 pt-2">
            {(['brandPoint1', 'brandPoint2', 'brandPoint3'] as const).map((key) => (
              <li key={key} className="flex items-center gap-3 text-sm text-white/90">
                <span className="flex size-6 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                  <CheckIcon className="size-3.5" />
                </span>
                {msg(key)}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative flex items-center gap-2 text-xs text-white/60">
          <LockKeyholeIcon className="size-3.5" />
          {msg('securedBy')}
        </p>
      </aside>

      {/* ── Form column ─────────────────────────────────────────────── */}
      <main className="relative flex flex-col">
        <header className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-8 sm:pt-7">
          <Logo className="lg:invisible" />
          <div className="flex items-center gap-1">
            {enabledLanguages.length > 1 && (
              <Suspense>
                <LanguageMenu i18n={i18n} />
              </Suspense>
            )}
            {backUrl && (
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
                <a href={backUrl}>
                  <ArrowLeftIcon />
                  <span className="hidden sm:inline">{msg('backToApp')}</span>
                </a>
              </Button>
            )}
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="animate-in fade-in slide-in-from-bottom-2 w-full max-w-[400px] duration-500">
            <div className="mb-7 space-y-2">
              {showAttemptedUsername ? (
                <div className="space-y-3">
                  {headerNode && <h1 className="text-2xl font-semibold tracking-tight">{headerNode}</h1>}
                  <div className="bg-muted/60 flex items-center justify-between gap-2 rounded-full border py-1 pr-1 pl-3.5">
                    <span id="kc-attempted-username" className="truncate text-sm font-medium">
                      {auth.attemptedUsername}
                    </span>
                    <Button variant="ghost" size="icon-sm" asChild className="rounded-full" title={msgStr('restartLoginTooltip')}>
                      <a id="reset-login" href={url.loginRestartFlowUrl} aria-label={msgStr('restartLoginTooltip')}>
                        <RotateCcwIcon />
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                headerNode && (
                  <h1 id="kc-page-title" className="text-2xl font-semibold tracking-tight text-balance">
                    {headerNode}
                  </h1>
                )
              )}
              {subtitleNode && <p className="text-muted-foreground text-sm leading-relaxed">{subtitleNode}</p>}
              {displayRequiredFields && (
                <p className="text-muted-foreground text-xs">
                  <span className="text-destructive">*</span> {msg('requiredFields')}
                </p>
              )}
            </div>

            <div className="space-y-6">
              {displayMessage && message !== undefined && (message.type !== 'warning' || !isAppInitiatedAction) && (
                <KcMessage type={message.type} summary={message.summary} />
              )}

              {children}

              {auth?.showTryAnotherWayLink && (
                <form id="kc-select-try-another-way-form" action={url.loginAction} method="post" className="text-center">
                  <input type="hidden" name="tryAnotherWay" value="on" />
                  <Button type="submit" variant="link" className="h-auto p-0 text-sm">
                    {msg('doTryAnotherWay')}
                  </Button>
                </form>
              )}

              {socialProvidersNode}

              {displayInfo && infoNode && (
                <div id="kc-info" className="text-muted-foreground border-t pt-6 text-center text-sm">
                  {infoNode}
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-5 pb-6 text-xs">
          <span>© {CURRENT_YEAR} SuperApp</span>
          {backUrl && <TextLink href={backUrl} className="text-muted-foreground text-xs font-normal">{msg('backToApp')}</TextLink>}
        </footer>
      </main>
    </div>
  )
}
