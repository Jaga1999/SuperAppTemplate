import {
  ActivityIcon,
  ArrowRightIcon,
  CalendarClockIcon,
  CheckIcon,
  CircleIcon,
  CrownIcon,
  FingerprintIcon,
  FlagIcon,
  LockKeyholeIcon,
  LogOutIcon,
  MoonStarIcon,
  ServerIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { GoogleIcon } from '@superapp/ui/components/brand/google-icon'
import { Logo } from '@superapp/ui/components/brand/logo'
import { Badge } from '@superapp/ui/components/badge'
import { Button } from '@superapp/ui/components/button'
import { cn } from '@superapp/ui/lib/utils'
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
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
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
              Your tasks, <span className="text-brand-gradient">finally under control.</span>
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg leading-relaxed text-pretty">
              SuperApp is a calm, fast to-do list with the security of a bank: passwordless sign-in, two-step verification,
              and a session you can end on every device in one click.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {signedIn ? (
                <Button asChild size="lg" className="h-11 px-5 text-base">
                  <Link to="/app">Open your todos <ArrowRightIcon /></Link>
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
              <span className="inline-flex items-center gap-1.5"><CheckIcon className="text-success size-4" /> Free forever plan</span>
              <span className="inline-flex items-center gap-1.5"><CheckIcon className="text-success size-4" /> No credit card</span>
              <span className="inline-flex items-center gap-1.5"><CheckIcon className="text-success size-4" /> Delete anytime</span>
            </p>
          </div>
          <HeroPreview />
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────── */}
      <section id="features" className="border-t">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <SectionHeading eyebrow="Features" title="Everything you need. Nothing you don't." subtitle="Fast enough to keep up with your day, strict enough to protect it." />
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon={<FingerprintIcon />} title="Passkeys & two-step verification">
              Sign in with your fingerprint or face, or add an authenticator app and recovery codes.
            </Feature>
            <Feature icon={<LogOutIcon />} title="Sign out everywhere, instantly">
              Lost a laptop? End every session in one click. Access is cut off immediately, not when a token expires.
            </Feature>
            <Feature icon={<ActivityIcon />} title="Live activity feed">
              Every change is streamed through an event log, so your history is always up to date.
            </Feature>
            <Feature icon={<FlagIcon />} title="Priorities that matter" premium>
              Flag what is urgent and let the list sort itself: important and due-soon first.
            </Feature>
            <Feature icon={<CalendarClockIcon />} title="Due dates & overdue alerts" premium>
              Schedule work and see what slipped at a glance.
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

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <section id="pricing">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <SectionHeading eyebrow="Pricing" title="Start free. Upgrade when you're ready." />
          <div className="mx-auto mt-14 grid max-w-4xl gap-5 md:grid-cols-2">
            <PlanCard name="Free" price="$0" description="For getting organized." features={['Up to 25 open todos', 'Passkeys & two-step verification', 'Activity feed', 'All devices']} cta="Get started" onCta={auth.signUp} />
            <PlanCard name="Premium" price="$4" highlighted description="For people who ship." features={['Unlimited todos', 'Priorities', 'Due dates & overdue alerts', 'Everything in Free']} cta="Start with Premium" onCta={auth.signUp} />
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="px-5 pb-24">
        <div className="bg-brand-gradient relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-8 py-16 text-center text-white">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-10" />
          <h2 className="relative text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Clear your head. Start in 30 seconds.</h2>
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

function Feature({ icon, title, children, premium }: { icon: ReactNode; title: string; children: ReactNode; premium?: boolean }) {
  return (
    <div className="bg-card group hover:border-primary/30 relative rounded-2xl border p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
      <div className="bg-primary/8 text-primary mb-4 flex size-10 items-center justify-center rounded-xl [&_svg]:size-5">{icon}</div>
      <h3 className="flex items-center gap-2 font-semibold">
        {title}
        {premium && <CrownIcon className="text-warning size-3.5" aria-label="Premium" />}
      </h3>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{children}</p>
    </div>
  )
}

function PlanCard({ name, price, description, features, cta, onCta, highlighted }: { name: string; price: string; description: string; features: string[]; cta: string; onCta: () => void; highlighted?: boolean }) {
  return (
    <div className={cn('bg-card relative flex flex-col rounded-2xl border p-7', highlighted && 'border-primary/40 ring-primary/15 shadow-xl shadow-primary/10 ring-4')}>
      {highlighted && <Badge className="absolute -top-3 left-7">Most popular</Badge>}
      <p className="font-semibold">{name}</p>
      <p className="text-muted-foreground text-sm">{description}</p>
      <p className="mt-5 text-4xl font-semibold tracking-tight">
        {price}
        <span className="text-muted-foreground text-base font-normal">/month</span>
      </p>
      <ul className="mt-6 flex-1 space-y-2.5 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2.5">
            <CheckIcon className="text-primary size-4" /> {f}
          </li>
        ))}
      </ul>
      <Button className="mt-7 h-10" variant={highlighted ? 'default' : 'outline'} onClick={onCta}>{cta}</Button>
    </div>
  )
}

function HeroPreview() {
  const items = [
    { title: 'Review Q4 roadmap', done: false, priority: 'High', due: 'Today' },
    { title: 'Enable passkeys for the team', done: false, priority: 'Medium', due: 'Tomorrow' },
    { title: 'Book flights to Lisbon', done: true },
    { title: 'Reply to design feedback', done: false, priority: 'Low' },
  ]
  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 relative duration-1000">
      <div className="bg-primary/20 absolute -inset-4 rounded-[2rem] blur-2xl" />
      <div className="bg-card/90 relative rounded-2xl border p-5 shadow-2xl backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-semibold">Today</p>
            <p className="text-muted-foreground text-xs">3 open · 1 done</p>
          </div>
          <Badge variant="secondary" className="gap-1"><CrownIcon className="size-3" />Premium</Badge>
        </div>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.title} className="bg-background flex items-center gap-3 rounded-xl border p-3">
              {item.done ? (
                <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-md"><CheckIcon className="size-3.5" /></span>
              ) : (
                <CircleIcon className="text-muted-foreground size-5" />
              )}
              <span className={cn('flex-1 text-sm', item.done && 'text-muted-foreground line-through')}>{item.title}</span>
              {item.priority && (
                <span className={cn('rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium', item.priority === 'High' ? 'bg-destructive/10 text-destructive' : item.priority === 'Medium' ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground')}>
                  {item.priority}
                </span>
              )}
              {item.due && <span className="text-muted-foreground hidden text-xs sm:inline">{item.due}</span>}
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
