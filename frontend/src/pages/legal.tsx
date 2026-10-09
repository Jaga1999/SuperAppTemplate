import privacyPolicy from '@legal/privacy-policy.md?raw'
import termsAndConditions from '@legal/terms-and-conditions.md?raw'
import { ArrowLeftIcon } from 'lucide-react'
import Markdown from 'react-markdown'
import { Link } from 'react-router'
import remarkGfm from 'remark-gfm'
import { Logo } from '@/components/ui/brand/logo'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '../components/theme-toggle'

/**
 * Public legal pages. The text comes straight from legal/*.md at the repo root, the same files whose `version`
 * Keycloak's legal-consent step checks, so what users read is exactly what they accept.
 */
type LegalDoc = { title: string; version: string; effective: string; body: string }

function parse(source: string): LegalDoc {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source)
  const meta = Object.fromEntries(
    (match?.[1] ?? '')
      .split(/\r?\n/)
      .map((line) => line.split(/:(.*)/s).map((part) => part.trim().replace(/^["']|["']$/g, '')))
      .filter(([key]) => key),
  )
  return { title: meta.title ?? '', version: meta.version ?? '', effective: meta.effective ?? '', body: match?.[2] ?? source }
}

const documents = {
  terms: parse(termsAndConditions),
  privacy: parse(privacyPolicy),
} as const

export function TermsPage() {
  return <LegalPage doc={documents.terms} other={{ to: '/legal/privacy', label: 'Privacy Policy' }} />
}

export function PrivacyPage() {
  return <LegalPage doc={documents.privacy} other={{ to: '/legal/terms', label: 'Terms and Conditions' }} />
}

function LegalPage({ doc, other }: { doc: LegalDoc; other: { to: string; label: string } }) {
  return (
    <div className="bg-background min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link to="/" aria-label="SuperApp home">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground mb-6 -ml-2">
          <Link to="/"><ArrowLeftIcon /> Back to SuperApp</Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">{doc.title}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Effective {doc.effective} · Version {doc.version}
        </p>

        <article
          className="text-foreground/90 mt-8 space-y-4 leading-relaxed
            [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4
            [&_blockquote]:bg-muted/50 [&_blockquote]:text-muted-foreground [&_blockquote]:rounded-lg [&_blockquote]:border-l-4 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:text-sm
            [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight
            [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6
            [&_strong]:text-foreground [&_strong]:font-semibold
            [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-sm
            [&_td]:border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:bg-muted/50 [&_th]:border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left"
        >
          <Markdown remarkPlugins={[remarkGfm]}>{doc.body}</Markdown>
        </article>

        <footer className="text-muted-foreground mt-12 flex flex-wrap items-center justify-between gap-3 border-t pt-6 text-sm">
          <span>Questions? Contact us at the address above.</span>
          <Link to={other.to} className="text-primary font-medium underline-offset-4 hover:underline">{other.label}</Link>
        </footer>
      </main>
    </div>
  )
}
