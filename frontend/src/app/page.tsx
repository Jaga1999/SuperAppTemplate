import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { site } from '@/lib/site'
import { LandingPage } from '@/views/landing'

export const metadata: Metadata = {
  title: { absolute: `${site.name}: secure accounts from day one` },
  alternates: { canonical: '/' },
}

/** Structured data for search engines (schema.org), rendered with this request's CSP nonce. */
function jsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: site.name,
    url: site.url,
    description: site.description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
  }
  // Escape "<" so no value can close the script tag.
  return JSON.stringify(data).replace(/</g, '\u003c')
}

export default async function Home() {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <>
      <script type="application/ld+json" nonce={nonce} suppressHydrationWarning>
        {jsonLd()}
      </script>
      <LandingPage />
    </>
  )
}
