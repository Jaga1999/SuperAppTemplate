import type { Metadata } from 'next'
import { readLegalDoc } from '@/lib/legal'
import { LegalPage } from '@/views/legal'

export async function generateMetadata(): Promise<Metadata> {
  const doc = await readLegalDoc('terms')
  return { title: doc.title, description: `${doc.title}, version ${doc.version}.`, alternates: { canonical: '/legal/terms' } }
}

export default async function TermsPage() {
  return <LegalPage doc={await readLegalDoc('terms')} other={{ href: '/legal/privacy', label: 'Privacy Policy' }} />
}
