import type { Metadata } from 'next'
import { SecuritySettings } from '@/views/settings/security'

export const metadata: Metadata = { title: 'Security' }

export default function Page() {
  return <SecuritySettings />
}
