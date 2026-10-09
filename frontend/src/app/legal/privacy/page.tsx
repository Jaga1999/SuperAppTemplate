import type { Metadata } from 'next'
import { readLegalDoc } from '@/lib/legal'
import { LegalPage } from '@/views/legal'

export async function generateMetadata(): Promise<Metadata> {
  const doc = await readLegalDoc('privacy')
  return { title: doc.title, description: `${doc.title}, version ${doc.version}.`, alternates: { canonical: '/legal/privacy' } }
}

export default async function PrivacyPage() {
  return <LegalPage doc={await readLegalDoc('privacy')} other={{ href: '/legal/terms', label: 'Terms and Conditions' }} />
}
