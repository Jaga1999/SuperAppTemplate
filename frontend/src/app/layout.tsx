import '@/styles/globals.css'
import { GeistSans } from 'geist/font/sans'
import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import type { ReactNode } from 'react'
import { site } from '@/lib/site'
import { Providers } from './providers'

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: { type: 'website', siteName: site.name, title: site.name, description: site.description, url: '/', locale: 'en_US' },
  twitter: { card: 'summary_large_image', title: site.name, description: site.description },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false, email: false, address: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: site.themeColor.light },
    { media: '(prefers-color-scheme: dark)', color: site.themeColor.dark },
  ],
  colorScheme: 'light dark',
}

/** Rendered per request: the CSP nonce from src/proxy.ts reaches the theme script through the providers. */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <html lang="en" className={GeistSans.variable} suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-svh antialiased">
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  )
}
