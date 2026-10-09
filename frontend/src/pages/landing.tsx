import {
  ArrowRightIcon,
  CheckIcon,
  FingerprintIcon,
  KeyRoundIcon,
  LockKeyholeIcon,
  LogOutIcon,
  MailCheckIcon,
  MoonStarIcon,
  ServerIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { GoogleIcon } from '@/components/ui/brand/google-icon'
import { Logo } from '@/components/ui/brand/logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ActionStatusToasts } from '../components/action-status-toasts'
import { ThemeToggle } from '../components/theme-toggle'
import { auth } from '../lib/auth'
import { CURRENT_YEAR } from '../lib/format'
import { useMe, usePublicConfig } from '../lib/queries'

export function LandingPage() {
  const { data: me } = useMe()
  const { data: config } = usePublicConfig()
  const signedIn = !!me

  return (
    <div className="bg-background text-foreground min-h-svh overflow-x-clip">
      <ActionStatusToasts />

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="bg-background/70 sticky top-0 z-30 border-b border-transparent backdrop-blur-xl supports-[backdrop-filter]:border-border/60">
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
          <Link to="/" aria-label="SuperApp home">
            <Logo />
          </Link>
          <div className="text-muted-foreground hidden items-center gap-6 text-sm md:flex">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#security" className="hover:text-foreground transition-colors">Security</a>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            {signedIn ? (
              <Button asChild size="lg">
                <Link to="/app">
                  Open app <ArrowRightIcon />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="lg" onClick={() => auth.signIn('/app')}>Sign in</Button>
                <Button size="lg" onClick={auth.signUp} className="hidden sm:inline-flex">Get started</Button>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
        <div className="bg-primary/25 pointer-events-none absolute top-[-10rem] left-1/2 h-[28rem] w-[56rem] -translate-x-1/2 rounded-full blur-[120px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pt-20 pb-24 lg:grid-cols-[1.05fr_1fr] lg:pt-28">
          <div className="animate-in fade-in slide-in-from-bottom-3 space-y-7 duration-700">
            <Badge variant="outline" className="bg-background/60 gap-1.5 rounded-full px-3 py-1 backdrop-blur">
              <SparklesIcon className="text-primary size-3.5" />
              Passkeys, MFA and instant sign-out built in
            </Badge>
            <h1 className="text-5xl leading-[1.04] font-semibold tracking-tight text-balance sm:text-6xl">
              Build your product, <span className="text-brand-gradient">not your sign-in.</span>
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg leading-relaxed text-pretty">
              SuperApp starts with the security of a bank: passwordless sign-in, two-step verification,
              and a session you can end on every device in one click.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {signedIn ? (
                <Button asChild size="lg" className="h-11 px-5 text-base">
                  <Link to="/app">Open app <ArrowRightIcon /></Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" className="h-11 px-5 text-base shadow-lg shadow-primary/20" onClick={auth.signUp}>
                    Get started free <ArrowRightIcon />
                  </Button>
                  {config?.googleLoginEnabled && (
                    <Button size="lg" variant="outline" className="h-11 gap-2.5 px-5 text-base" onClick={auth.withGoogle}>
                      <GoogleIcon className="size-4.5" /> Continue with Google
                    </Button>
                  )}
                </>
              )}
            </div>
            <p className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-1.5"><CheckIcon className="text-success size-4" /> Passkeys</span>
              <span className="inline-flex items-center gap-1.5"><CheckIcon className="text-success size-4" /> Two-step verification</span>
              <span className="inline-flex items-center gap-1.5"><CheckIcon className="text-success size-4" /> Delete anytime</span>
            </p>
          </div>
          <HeroPreview />
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────── */}
      <section id="features" className="border-t">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <SectionHeading eyebrow="Features" title="Everything you need. Nothing you don't." subtitle="A secure account system from day one, so you can focus on your product." />
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon={<FingerprintIcon />} title="Passkeys & two-step verification">
              Sign in with your fingerprint or face, or add an authenticator app and recovery codes.
            </Feature>
            <Feature icon={<LogOutIcon />} title="Sign out everywhere, instantly">
              Lost a laptop? End every session in one click. Access is cut off immediately, not when a token expires.
            </Feature>
            <Feature icon={<MailCheckIcon />} title="Verified email & password reset">
              Email verification, password reset and security alerts arrive with your own branding.
            </Feature>
            <Feature icon={<UsersIcon />} title="Device sessions">
              See every signed-in device and end any of them, or all of them, from your settings.
            </Feature>
            <Feature icon={<KeyRoundIcon />} title="Social sign-in">
              Let people continue with Google and link or unlink providers from their account.
            </Feature>
            <Feature icon={<MoonStarIcon />} title="Beautiful in the dark">
              Light, dark or system. Keyboard friendly and accessible throughout.
            </Feature>
          </div>
        </div>
      </section>

      {/* ── Security ────────────────────────────────────────────────── */}
      <section id="security" className="bg-muted/30 border-y">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-24 lg:grid-cols-2">
          <div className="space-y-6">
            <SectionHeading align="left" eyebrow="Security" title="Your session never touches the browser." subtitle="SuperApp uses a backend-for-frontend: sign-in happens on our own domain, tokens stay on the server, and your browser only holds an encrypted, HttpOnly cookie." />
            <ul className="space-y-3 text-sm">
              {[
                'Industry-standard OpenID Connect with PKCE: no passwords ever reach the app',
                'Tokens encrypted at rest in HttpOnly, SameSite cookies, invisible to scripts',
                'Every change is protected against cross-site request forgery',
                'Brute-force lockout, rate limiting and strong password rules',
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <ShieldCheckIcon className="text-primary mt-0.5 size-4.5 shrink-0" />
                  <span className="text-muted-foreground">{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <ArchitectureDiagram />
        </div>
      </section>


      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="px-5 pb-24">
        <div className="bg-brand-gradient relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-8 py-16 text-center text-white">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-10" />
          <h2 className="relative text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Start in 30 seconds.</h2>
          <p className="relative mx-auto mt-3 max-w-lg text-white/75">Create an account with your email, Google, or a passkey.</p>
          <Button size="lg" variant="secondary" className="relative mt-8 h-11 px-6 text-base" onClick={signedIn ? undefined : auth.signUp} asChild={signedIn}>
            {signedIn ? <Link to="/app">Open app</Link> : <span>Create your free account</span>}
          </Button>
        </div>
      </section>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm sm:flex-row">
          <Logo className="text-foreground" />
          <p>© {CURRENT_YEAR} SuperApp. Built with Spring Boot, Keycloak and React.</p>
          <nav className="flex gap-4">
            <Link to="/legal/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/legal/privacy" className="hover:text-foreground">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

function SectionHeading({ eyebrow, title, subtitle, align = 'center' }: { eyebrow: string; title: string; subtitle?: string; align?: 'center' | 'left' }) {
  return (
    <div className={cn('space-y-3', align === 'center' && 'mx-auto max-w-2xl text-center')}>
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {subtitle && <p className="text-muted-foreground text-lg leading-relaxed text-pretty">{subtitle}</p>}
    </div>
  )
}

function Feature({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="bg-card group hover:border-primary/30 relative rounded-2xl border p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
      <div className="bg-primary/8 text-primary mb-4 flex size-10 items-center justify-center rounded-xl [&_svg]:size-5">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{children}</p>
    </div>
  )
}

function HeroPreview() {
  const items = [
    { icon: FingerprintIcon, title: 'Passkey', detail: 'This device' },
    { icon: ShieldCheckIcon, title: 'Authenticator app', detail: 'Two-step verification' },
    { icon: KeyRoundIcon, title: 'Recovery codes', detail: '10 remaining' },
    { icon: LogOutIcon, title: 'Sessions', detail: '2 devices · sign out anytime' },
  ]
  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 relative duration-1000">
      <div className="bg-primary/20 absolute -inset-4 rounded-[2rem] blur-2xl" />
      <div className="bg-card/90 relative rounded-2xl border p-5 shadow-2xl backdrop-blur">
        <div className="mb-4">
          <p className="font-semibold">Account security</p>
          <p className="text-muted-foreground text-xs">Everything is on</p>
        </div>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.title} className="bg-background flex items-center gap-3 rounded-xl border p-3">
              <item.icon className="text-primary size-5" />
              <span className="flex-1 text-sm">{item.title}</span>
              <span className="text-muted-foreground hidden text-xs sm:inline">{item.detail}</span>
              <CheckIcon className="text-success size-4" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function ArchitectureDiagram() {
  const node = 'bg-card flex items-center gap-3 rounded-xl border p-4 shadow-sm'
  return (
    <div className="space-y-3">
      <div className={node}>
        <span className="bg-muted flex size-9 items-center justify-center rounded-lg"><MoonStarIcon className="size-4" /></span>
        <div className="text-sm"><p className="font-medium">Your browser</p><p className="text-muted-foreground text-xs">Encrypted HttpOnly cookie only</p></div>
      </div>
      <Connector />
      <div className={cn(node, 'border-primary/40 ring-primary/10 ring-4')}>
        <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg"><ServerIcon className="size-4" /></span>
        <div className="text-sm"><p className="font-medium">SuperApp backend (BFF)</p><p className="text-muted-foreground text-xs">Holds tokens · refreshes silently · revokes instantly</p></div>
      </div>
      <Connector />
      <div className={node}>
        <span className="bg-muted flex size-9 items-center justify-center rounded-lg"><LockKeyholeIcon className="size-4" /></span>
        <div className="text-sm"><p className="font-medium">Identity provider</p><p className="text-muted-foreground text-xs">Private network · passkeys · MFA · Google</p></div>
      </div>
    </div>
  )
}

function Connector() {
  return <div className="bg-border mx-auto h-6 w-px" />
}
