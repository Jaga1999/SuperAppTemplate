import type { Metadata } from 'next'
import { SessionsSettings } from '@/views/settings/sessions'

export const metadata: Metadata = { title: 'Devices' }

export default function Page() {
  return <SessionsSettings />
}
